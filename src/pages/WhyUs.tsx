import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, ClipboardCheck, Users, Leaf, Award, Lock } from "lucide-react";

const standards = [
  { icon: ShieldCheck, title: "Background Checked", description: "Every team member passes a comprehensive background check before joining Olive Clean. Your safety is non-negotiable." },
  { icon: Lock, title: "Insured & Bonded", description: "We carry full liability insurance and bonding coverage. Your home and belongings are protected on every visit." },
  { icon: ClipboardCheck, title: "The Olive Standard™", description: "Our proprietary 40-point checklist ensures nothing is missed. From baseboards to ceiling fans, every detail is accounted for." },
  { icon: Leaf, title: "100% Eco-Friendly", description: "Non-toxic, biodegradable products safe for kids, pets, and the planet. No harsh chemicals, ever." },
  { icon: Users, title: "Consistent Teams", description: "You'll see the same familiar faces every visit. Our team model means your cleaners know your home inside and out." },
  { icon: Award, title: "Satisfaction Guaranteed", description: "Not happy? We'll re-clean within 24 hours at no extra charge. Period." },
];

const checklist = [
  "Sanitize all kitchen surfaces and appliances",
  "Deep-clean bathroom fixtures and grout lines",
  "Dust all reachable surfaces, vents, and blinds",
  "Vacuum and mop all hard floors",
  "Vacuum carpets and rugs with HEPA filtration",
  "Clean mirrors and glass surfaces streak-free",
  "Empty all trash cans and replace liners",
  "Wipe down light switches, door handles, and railings",
  "Tidy cushions, throws, and visible clutter",
  "Final walkthrough quality check",
];

export default function WhyUs() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-primary">
        <div className="container max-w-3xl text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-foreground/60">Trust & Quality</span>
          <h1 className="text-clamp-hero font-bold text-primary-foreground -tracking-[0.02em]">
            Why Nashville Families Choose Olive Clean
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
            We don't cut corners — we clean them. Here's what sets us apart from every other cleaning service.
          </p>
        </div>
      </section>

      {/* Trust Signals Grid */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {standards.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
                <item.icon className="h-8 w-8 text-primary" />
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Olive Standard Checklist */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-3xl space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-clamp-section font-bold text-foreground">The Olive Standard™ Checklist</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every cleaning follows our 40-point checklist. Here's a snapshot of what's included on every visit.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-card rounded-xl border border-border p-4">
                <ClipboardCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="container max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to Experience the Difference?</h2>
          <p className="text-primary-foreground/70">Book a free estimate and see why Nashville families trust Olive Clean.</p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base">
            <Link to="/book">Get Your Free Estimate <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
