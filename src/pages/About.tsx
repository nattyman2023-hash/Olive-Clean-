import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Eye, Zap, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollReveal(0.15);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-[4px]"} ${className}`}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {children}
    </div>
  );
}

const values = [
  {
    icon: Eye,
    title: "We Remember Everything",
    description: "Your preferences, your routines, the way you like your pillows arranged. We build a profile for every home so your clean is personal every time.",
  },
  {
    icon: Zap,
    title: "Speed Without Shortcuts",
    description: "Our technicians follow the Debbie Sardone method — a choreographed system that cuts wasted motion, not corners. Faster for you, thorough for your home.",
  },
  {
    icon: Heart,
    title: "Premium Without Pretension",
    description: "We believe luxury is about care, not ceremony. Real flowers on your counter, not a velvet rope. Down-to-earth people doing exceptional work.",
  },
  {
    icon: Users,
    title: "Community First",
    description: "We hire locally, pay above market, and invest in our team. When our cleaners thrive, your home benefits. It's that simple.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-muted/40">
        <RevealSection className="container max-w-3xl text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary mb-4">Our Story</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground -tracking-[0.02em] leading-[1.1] text-wrap-balance mb-6">
            Cleaning Redefined for Nashville Families
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
            Olive Clean was founded on one idea: your home should feel like a sanctuary, and getting it there shouldn't add stress to your life.
          </p>
        </RevealSection>
      </section>

      {/* The Method */}
      <section className="py-20 md:py-28">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <RevealSection>
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary mb-3">The Method</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground -tracking-[0.01em] mb-4 leading-tight">
                Trained in the Debbie Sardone Speed Cleaning System
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Every Olive Clean technician is certified in the Debbie Sardone method — the gold standard in residential cleaning. It's not about rushing. It's about eliminating wasted steps through a precise, repeatable system.
              </p>
            </RevealSection>
            <RevealSection>
              <div className="bg-muted/50 rounded-2xl p-8 space-y-5">
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">Systematic room-by-room flow</h3>
                  <p className="text-sm text-muted-foreground">Each technician follows the same sequence so nothing gets missed — ever.</p>
                </div>
                <div className="border-t border-border" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">Right tool, right surface, every time</h3>
                  <p className="text-sm text-muted-foreground">We match products and techniques to your home's materials for a safer, better clean.</p>
                </div>
                <div className="border-t border-border" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">Consistent results you can rely on</h3>
                  <p className="text-sm text-muted-foreground">Whether it's your first clean or your fiftieth, the standard never drops.</p>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 bg-muted/40">
        <div className="container max-w-4xl">
          <RevealSection className="text-center mb-14">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary mb-3">What We Stand For</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground -tracking-[0.01em]">
              Four Commitments to Every Home
            </h2>
          </RevealSection>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <RevealSection key={v.title}>
                <div
                  className="bg-card rounded-2xl border border-border p-7 h-full shadow-sm hover:shadow-md transition-shadow duration-300"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <v.icon className="h-5 w-5 text-primary mb-4" />
                  <h3 className="font-semibold text-foreground text-base mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Why Nashville */}
      <section className="py-20 md:py-28">
        <RevealSection className="container max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-primary mb-3">Local Roots</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground -tracking-[0.01em] mb-4">
            Built for Nashville, by Nashville
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            From Belle Meade to Brentwood, Franklin to Green Hills — we know these neighborhoods because we live here too. Olive Clean exists to serve the families who make this city remarkable.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base active:scale-[0.97] transition-transform shadow-lg"
          >
            <Link to="/book">
              Book Your Free Estimate
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </RevealSection>
      </section>

      <Footer />
    </div>
  );
}
