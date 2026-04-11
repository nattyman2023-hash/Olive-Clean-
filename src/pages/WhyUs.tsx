import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, ClipboardCheck, Users, Leaf, Award, Lock, Star } from "lucide-react";
import TrustBadges from "@/components/TrustBadges";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

const standards = [
  { icon: ShieldCheck, title: "Background Checked", description: "Every team member passes a comprehensive background check before joining Olive Clean. Your safety is non-negotiable." },
  { icon: Lock, title: "Insured & Bonded", description: "We carry full liability insurance and bonding coverage. Your home and belongings are protected on every visit." },
  { icon: ClipboardCheck, title: "The Olive Standard™", description: "Our proprietary 40-point checklist ensures nothing is missed. From baseboards to ceiling fans, every detail is accounted for." },
  { icon: Leaf, title: "100% Eco-Friendly", description: "Non-toxic, biodegradable products safe for kids, pets, and the planet. No harsh chemicals, ever." },
  { icon: Users, title: "Consistent Teams", description: "You'll see the same familiar faces every visit. Our team model means your cleaners know your home inside and out." },
  { icon: Award, title: "Satisfaction Guaranteed", description: "Not happy? We'll re-clean within 24 hours at no extra charge. Period." },
];

const checklist = [
  "Sanitize all kitchen countertops, backsplash, and sink",
  "Clean and degrease stovetop, oven door, and range hood",
  "Clean inside microwave and oven door glass",
  "Wipe down all appliance exteriors (fridge, dishwasher, etc.)",
  "Clean behind refrigerator and oven (accessible areas)",
  "Deep-clean bathroom fixtures, tubs, showers, and grout lines",
  "Sanitize toilets inside, outside, and behind the base",
  "Clean and polish all mirrors and glass surfaces streak-free",
  "Dust all reachable surfaces, shelves, and mantels",
  "Dust ceiling fans, light fixtures, and vents",
  "Dust baseboards, crown molding, and window sills",
  "Vacuum all carpets and rugs with HEPA filtration",
  "Vacuum and mop all hard floors including edges",
  "Sanitize light switches, outlets, and door handles",
  "Wipe down door frames, railings, and banisters",
  "Empty all trash cans and replace liners",
  "Clean inside cabinets and drawers (upon request)",
  "Tidy cushions, throws, and visible clutter",
  "Spot-clean walls, scuff marks, and fingerprints",
  "Clean interior windows and sliding door tracks",
  "Dust blinds, shutters, and window treatments",
  "Organize and wipe down entryway and mudroom",
  "Final walkthrough quality check with team lead sign-off",
];

interface FeaturedEmployee {
  id: string;
  name: string;
  photo_url: string | null;
  certifications: string[];
}

export default function WhyUs() {
  const seo = getSEO("/why-us");
  const [featuredTeam, setFeaturedTeam] = useState<FeaturedEmployee[]>([]);

  useEffect(() => {
    supabase
      .from("employees")
      .select("id, name, photo_url, certifications")
      .eq("status", "active")
      .not("photo_url", "is", null)
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setFeaturedTeam(
            data.map((e) => ({
              ...e,
              certifications: Array.isArray(e.certifications)
                ? (e.certifications as string[])
                : [],
            }))
          );
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seo.title} description={seo.description} keywords={seo.keywords} canonicalPath="/why-us" />
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
          <div
            className="grid gap-8"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}
          >
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
              Every cleaning follows our 40-point checklist. Here's a snapshot of what's included on every visit — nothing is missed.
            </p>
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}
          >
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-card rounded-xl border border-border p-4">
                <ClipboardCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Your Cleaners */}
      {featuredTeam.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container max-w-4xl">
            <div className="text-center space-y-3 mb-12">
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Meet Your Cleaning Technicians</span>
              <h2 className="text-clamp-section font-bold text-foreground">
                Real People, Real Standards
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every Olive Clean technician is background-checked, trained to The Olive Standard™, and rated by clients like you.
              </p>
            </div>
            <div
              className="grid gap-8"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}
            >
              {featuredTeam.map((emp) => (
                <div key={emp.id} className="rounded-2xl border border-border bg-card p-6 text-center space-y-4 hover:shadow-md transition-shadow">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-muted">
                    {emp.photo_url ? (
                      <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{emp.name}</h3>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="text-xs font-medium text-accent">5-Star Professional</span>
                    </div>
                  </div>
                  {emp.certifications.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {emp.certifications.slice(0, 3).map((cert, i) => (
                        <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {String(cert)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonial Strip */}
      <section className="py-12 bg-muted/30">
        <div className="container max-w-3xl text-center space-y-4">
          <p className="text-lg italic text-foreground leading-relaxed">
            "I've tried four cleaning services in Nashville. Olive Clean is the only one where I felt like they genuinely cared about my home. The same team every time, and they remember everything."
          </p>
          <p className="text-sm text-muted-foreground font-medium">— Sarah M., Belle Meade</p>
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
          <TrustBadges variant="light" className="mt-4" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
