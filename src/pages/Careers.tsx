import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export default function Careers() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", cover_note: "" });
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      let resume_url: string | null = null;

      if (resume) {
        const ext = resume.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("resumes")
          .upload(path, resume);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
        resume_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("applicants").insert({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        cover_note: form.cover_note || null,
        resume_url,
      });
      if (error) throw error;

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Application Received</h1>
          <p className="text-muted-foreground">
            Thank you for your interest in joining Olive Clean. We'll review your application and get back to you soon.
          </p>
          <Link to="/" className="inline-block text-sm text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-3xl py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Join Olive Clean</h1>
            <p className="text-xs text-muted-foreground">Nashville's trusted home cleaning team</p>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-12 px-4">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3" style={{ textWrap: "balance" }}>
            We're looking for detail-oriented, reliable cleaners
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-xl">
            Olive Clean serves Nashville's finest homes. We offer competitive pay, flexible scheduling, 
            paid training, and a supportive team environment. If you take pride in your work and care about 
            the details, we'd love to hear from you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Full Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Email *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
                required
                className="rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(615) 555-0123"
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Resume (optional)</label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Tell us about yourself</label>
            <Textarea
              value={form.cover_note}
              onChange={(e) => setForm({ ...form, cover_note: e.target.value })}
              placeholder="Cleaning experience, availability, why you'd be a great fit..."
              className="rounded-xl min-h-[120px]"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full rounded-xl active:scale-[0.98] transition-transform">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Application
          </Button>
        </form>
      </main>
    </div>
  );
}
