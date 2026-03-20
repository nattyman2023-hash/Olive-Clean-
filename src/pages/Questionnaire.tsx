import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Leaf } from "lucide-react";

export default function Questionnaire() {
  const { clientId } = useParams<{ clientId: string }>();
  const [form, setForm] = useState({
    gate_code: "",
    alarm_code: "",
    pets: "",
    allergies: "",
    special_instructions: "",
    preferred_products: "",
    rooms_priority: "",
    parking_info: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    setSubmitting(true);
    try {
      // Build preferences object (only non-empty values)
      const preferences: Record<string, string> = {};
      Object.entries(form).forEach(([key, value]) => {
        if (value.trim()) {
          preferences[key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())] = value.trim();
        }
      });

      // Merge with existing preferences
      const { data: client, error: fetchErr } = await supabase
        .from("clients")
        .select("preferences")
        .eq("id", clientId)
        .single();

      if (fetchErr) throw fetchErr;

      const merged = { ...((client?.preferences as Record<string, string>) || {}), ...preferences };

      const { error } = await supabase
        .from("clients")
        .update({ preferences: merged })
        .eq("id", clientId);

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error("Failed to save. Please try again.");
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
          <h1 className="text-2xl font-bold text-foreground">Thank You!</h1>
          <p className="text-muted-foreground">
            Your home details have been saved. Our team will review them before your first clean.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container max-w-2xl py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Pre-Service Questionnaire</h1>
            <p className="text-xs text-muted-foreground">Help us prepare for your first clean</p>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-10 px-4">
        <p className="text-muted-foreground mb-8 max-w-lg">
          Please share any details about your home so our team can deliver the best possible experience. 
          All fields are optional — fill in what's relevant.
        </p>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Gate Code</label>
              <Input value={form.gate_code} onChange={(e) => setForm({ ...form, gate_code: e.target.value })} placeholder="e.g. #1234" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Alarm Code</label>
              <Input value={form.alarm_code} onChange={(e) => setForm({ ...form, alarm_code: e.target.value })} placeholder="If applicable" className="rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Pets</label>
            <Input value={form.pets} onChange={(e) => setForm({ ...form, pets: e.target.value })} placeholder="e.g. Two dogs (friendly), one cat" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Allergies or Sensitivities</label>
            <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. No bleach products, fragrance-free preferred" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Preferred Cleaning Products</label>
            <Input value={form.preferred_products} onChange={(e) => setForm({ ...form, preferred_products: e.target.value })} placeholder="e.g. Mrs. Meyer's, Method, or any eco-friendly" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Room Priorities</label>
            <Input value={form.rooms_priority} onChange={(e) => setForm({ ...form, rooms_priority: e.target.value })} placeholder="e.g. Kitchen and master bath are top priority" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Parking Info</label>
            <Input value={form.parking_info} onChange={(e) => setForm({ ...form, parking_info: e.target.value })} placeholder="e.g. Park in driveway, not on street" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Special Instructions</label>
            <Textarea
              value={form.special_instructions}
              onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
              placeholder="Anything else we should know about your home..."
              className="rounded-xl min-h-[100px]"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full rounded-xl active:scale-[0.98] transition-transform">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Home Details
          </Button>
        </form>
      </main>
    </div>
  );
}
