import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Briefcase, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const STEPS = ["Personal Info", "Experience", "Resume", "Review"];

export default function Careers() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    years_experience: "",
    available_days: [] as string[],
    has_transportation: false,
    cover_note: "",
    job_posting_id: null as string | null,
  });
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const { data: postings = [] } = useQuery({
    queryKey: ["job-postings-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_postings").select("*").eq("status", "open").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      available_days: f.available_days.includes(day)
        ? f.available_days.filter((d) => d !== day)
        : [...f.available_days, day],
    }));
  };

  const applyToJob = (postingId: string) => {
    setForm((f) => ({ ...f, job_posting_id: postingId }));
    setStep(0);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const canProceed = () => {
    if (step === 0) return !!form.name && !!form.email;
    return true;
  };

  const selectedPosting = postings.find((p: any) => p.id === form.job_posting_id);

  const handleSubmit = async () => {
    if (!form.name || !form.email) { toast.error("Name and email are required."); return; }
    setSubmitting(true);
    try {
      let resume_url: string | null = null;
      if (resume) {
        const ext = resume.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("resumes").upload(path, resume);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
        resume_url = urlData.publicUrl;
      }
      const appId = crypto.randomUUID();
      const { error } = await supabase.from("applicants").insert({
        id: appId,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        cover_note: form.cover_note || null,
        resume_url,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        available_days: form.available_days.length > 0 ? form.available_days : null,
        has_transportation: form.has_transportation,
        job_posting_id: form.job_posting_id,
      } as any);
      if (error) throw error;
      // Send confirmation email
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "application-received",
          recipientEmail: form.email,
          idempotencyKey: `app-received-${appId}`,
          templateData: {
            name: form.name,
            position: selectedPosting?.title,
          },
        },
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Application Received</h1>
            <p className="text-muted-foreground">Thank you for your interest in joining Olive Clean. We'll review your application and get back to you soon.</p>
            <Link to="/" className="inline-block text-sm text-primary hover:underline">← Back to Home</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-3xl py-24 px-4">
        {/* Open Positions */}
        {postings.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-4">Open Positions</h2>
            <div className="grid gap-4">
              {postings.map((p: any) => (
                <div key={p.id} className="bg-card rounded-2xl border border-border shadow-sm p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{p.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.type}</span>
                      </div>
                    </div>
                    <Button size="sm" className="rounded-xl shrink-0" onClick={() => applyToJob(p.id)}>
                      Apply Now
                    </Button>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-3">{p.description}</p>}
                  {p.requirements && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Requirements: </span>{p.requirements}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intro */}
        <div className="mb-8" ref={formRef}>
          <h2 className="text-xl font-bold text-foreground mb-2">Apply Now</h2>
          <p className="text-sm text-muted-foreground">Complete the form below to submit your application. We offer competitive pay, flexible scheduling, and paid training.</p>
        </div>

        {/* Applying for indicator */}
        {selectedPosting && (
          <div className="mb-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Applying for</p>
              <p className="text-sm font-semibold text-foreground">{selectedPosting.title}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setForm((f) => ({ ...f, job_posting_id: null }))}>
              General Application
            </Button>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <p className={`text-[0.6rem] mt-1 text-center ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Full Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" required className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Email *</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" required className="rounded-xl" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(615) 555-0123" className="rounded-xl" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Years of Cleaning Experience</label>
                <Input type="number" min="0" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} placeholder="0" className="rounded-xl w-32" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.available_days.includes(day) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={form.has_transportation} onCheckedChange={(v) => setForm({ ...form, has_transportation: !!v })} id="transport" />
                <label htmlFor="transport" className="text-sm text-foreground cursor-pointer">I have reliable transportation</label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Resume (optional)</label>
                <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResume(e.target.files?.[0] || null)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Tell us about yourself</label>
                <Textarea value={form.cover_note} onChange={(e) => setForm({ ...form, cover_note: e.target.value })} placeholder="Cleaning experience, why you'd be a great fit..." className="rounded-xl min-h-[120px]" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground text-sm">Review Your Application</h3>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {form.name}</p>
                <p><span className="font-medium">Email:</span> {form.email}</p>
                {form.phone && <p><span className="font-medium">Phone:</span> {form.phone}</p>}
                {selectedPosting && <p><span className="font-medium">Position:</span> {selectedPosting.title}</p>}
                {form.years_experience && <p><span className="font-medium">Experience:</span> {form.years_experience} years</p>}
                {form.available_days.length > 0 && <p><span className="font-medium">Available:</span> {form.available_days.join(", ")}</p>}
                <p><span className="font-medium">Transportation:</span> {form.has_transportation ? "Yes" : "No"}</p>
                {resume && <p><span className="font-medium">Resume:</span> {resume.name}</p>}
                {form.cover_note && <p><span className="font-medium">Note:</span> {form.cover_note}</p>}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button variant="outline" className="rounded-xl" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>
            {step < 3 ? (
              <Button className="rounded-xl" disabled={!canProceed()} onClick={() => setStep(step + 1)}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button className="rounded-xl" disabled={submitting} onClick={handleSubmit}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Submit Application
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
