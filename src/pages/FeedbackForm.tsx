import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Loader2, AlertCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function FeedbackForm() {
  const { jobId } = useParams<{ jobId: string }>();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comments, setComments] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobInfo, setJobInfo] = useState<{ service: string; clientName: string; date: string; assignedTo: string | null } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJob() {
      if (!jobId) { setError("Invalid feedback link."); setLoading(false); return; }

      const { data, error: err } = await supabase
        .from("jobs")
        .select("service, scheduled_at, status, client_id, assigned_to, clients(name)")
        .eq("id", jobId)
        .single();

      if (err || !data) { setError("Oops! This link seems to have expired. Please contact us if you still wish to leave feedback."); setLoading(false); return; }
      if (data.status !== "completed") { setError("Oops! This link seems to have expired. Please contact us if you still wish to leave feedback."); setLoading(false); return; }

      const { data: existing } = await supabase
        .from("feedback")
        .select("id")
        .eq("job_id", jobId)
        .limit(1);

      if (existing && existing.length > 0) { setSubmitted(true); setLoading(false); return; }

      setJobInfo({
        service: data.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        clientName: (data.clients as any)?.name || "Your Home",
        date: new Date(data.scheduled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        assignedTo: data.assigned_to || null,
      });
      setLoading(false);
    }
    loadJob();
  }, [jobId]);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating."); return; }
    if (!jobId) return;

    setSubmitting(true);

    const { data: job } = await supabase.from("jobs").select("client_id, assigned_to").eq("id", jobId).single();
    if (!job) { toast.error("Job not found."); setSubmitting(false); return; }

    // Look up employee_id from employees table using assigned_to (user_id)
    let employeeId: string | null = null;
    if (job.assigned_to) {
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", job.assigned_to)
        .maybeSingle();
      employeeId = emp?.id || null;
    }

    const fbId = crypto.randomUUID();
    const { error: fbErr } = await supabase.from("feedback").insert({
      id: fbId,
      job_id: jobId,
      client_id: job.client_id,
      rating,
      comments: comments.trim() || null,
      employee_id: employeeId,
    } as any);

    if (fbErr) { toast.error("Failed to submit feedback."); setSubmitting(false); return; }

    // Upload photos
    for (const file of photos) {
      const ext = file.name.split(".").pop();
      const path = `${jobId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("after_photos").upload(path, file);
      if (!uploadErr) {
        await supabase.from("job_attachments" as any).insert({
          job_id: jobId,
          uploader_id: job.client_id,
          uploader_role: "client",
          file_path: path,
          bucket: "after_photos",
          category: "after",
        });
      }
    }

    // Send thank-you email
    const { data: clientData } = await supabase
      .from("clients")
      .select("email")
      .eq("id", job.client_id)
      .single();
    if (clientData?.email) {
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "feedback-thank-you",
          recipientEmail: clientData.email,
          idempotencyKey: `feedback-thanks-${fbId}`,
          templateData: {
            rating,
            service: jobInfo?.service,
          },
        },
      });
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - photos.length);
    setPhotos((prev) => [...prev, ...newFiles]);
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-foreground font-medium">{error}</p>
          <Link to="/" className="text-primary text-sm hover:underline">Back to Olive Clean</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Thank You!</h2>
          <p className="text-sm text-muted-foreground">Your feedback helps us deliver the best experience for your home.</p>
          <Link to="/" className="text-primary text-sm hover:underline">Back to Olive Clean</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground text-sm font-bold">O</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">How did we do?</h1>
          {jobInfo && (
            <p className="text-sm text-muted-foreground">
              {jobInfo.service} at {jobInfo.clientName} · {jobInfo.date}
            </p>
          )}
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform active:scale-90"
            >
              <Star
                className={`h-9 w-9 transition-colors ${
                  s <= (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {rating === 0 ? "Tap a star to rate" : ["", "Poor", "Fair", "Good", "Great", "Exceptional"][rating]}
        </p>

        <Textarea
          placeholder="Tell us more about your experience (optional)..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          maxLength={1000}
          className="rounded-xl resize-none"
        />

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">After-service photos (up to 5)</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((f, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="w-full rounded-xl active:scale-[0.98]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Feedback
        </Button>
      </div>
    </div>
  );
}
