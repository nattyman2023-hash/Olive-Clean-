import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const serviceTiers = [
  { id: "essential", name: "The Essential Clean", price: "$120" },
  { id: "general", name: "General Clean", price: "$180" },
  { id: "signature", name: "Signature Deep Clean", price: "$320" },
  { id: "makeover", name: "Makeover Deep Clean", price: "$450+" },
];

const homeTypes = ["Apartment / Condo", "Townhouse", "Single Family", "Large Estate"];
const frequencies = ["One-Time", "Weekly", "Bi-Weekly", "Monthly"];

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    service: "",
    homeType: "",
    bedrooms: "",
    bathrooms: "",
    frequency: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const canNext =
    step === 0
      ? !!form.service
      : step === 1
      ? !!form.homeType && !!form.bedrooms && !!form.bathrooms
      : step === 2
      ? !!form.frequency
      : !!form.name && !!form.email && !!form.phone;

  const handleSubmit = () => {
    // TODO: Send to Supabase
    console.log("Booking submitted:", form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container max-w-lg pt-32 pb-24 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Request Received!</h1>
          <p className="text-muted-foreground leading-relaxed">
            Thank you, {form.name}. We'll review your details and reach out within 24 hours with a personalized estimate.
          </p>
          <Button asChild variant="outline" className="rounded-full active:scale-[0.97] transition-transform">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const steps = ["Service", "Home Details", "Schedule", "Contact"];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl pt-28 pb-24">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Get Your Free Estimate</h1>
        <p className="text-muted-foreground mb-8">Tell us about your home and we'll craft a custom cleaning plan.</p>

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
              <p className={`text-xs mt-2 ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          {/* Step 0: Service */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Choose your service</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {serviceTiers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update("service", t.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                      form.service === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs mt-1">Starting at {t.price}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Home Details */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Home details</h2>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Home Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {homeTypes.map((h) => (
                    <button
                      key={h}
                      onClick={() => update("homeType", h)}
                      className={`p-3 rounded-xl border-2 text-sm transition-all active:scale-[0.98] ${
                        form.homeType === h ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/30"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bedrooms</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={form.bedrooms}
                    onChange={(e) => update("bedrooms", e.target.value)}
                    placeholder="3"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bathrooms</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={form.bathrooms}
                    onChange={(e) => update("bathrooms", e.target.value)}
                    placeholder="2"
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Schedule */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Preferred schedule</h2>
              <div className="grid grid-cols-2 gap-3">
                {frequencies.map((f) => (
                  <button
                    key={f}
                    onClick={() => update("frequency", f)}
                    className={`p-4 rounded-xl border-2 text-sm transition-all active:scale-[0.98] ${
                      form.frequency === f ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Your information</h2>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Sarah Johnson" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="sarah@email.com" className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                  <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(615) 555-0142" className="rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Belle Meade Blvd" className="rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Special Notes (optional)</label>
                <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Gate code, pet info, areas of focus..." className="rounded-xl" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="rounded-full active:scale-[0.97] transition-transform"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="bg-primary hover:bg-primary/90 rounded-full active:scale-[0.97] transition-transform"
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canNext}
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-8 active:scale-[0.97] transition-transform"
              >
                Submit Request
              </Button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
