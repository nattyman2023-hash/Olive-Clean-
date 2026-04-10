import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import TrustBadges from "@/components/TrustBadges";
import AnimatedCounter from "@/components/AnimatedCounter";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 md:pt-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative blobs */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="max-w-2xl space-y-8">
          <div className="inline-block">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 px-4 py-2 rounded-full inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Nashville's Premium Cleaning
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.08] -tracking-[0.02em]">
            Reclaim Your Weekends
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Come home to spotless spaces and the peace of mind that comes with a team who remembers every detail of your home. More time for family, less time cleaning.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-8 text-base active:scale-[0.97] transition-transform shadow-lg shadow-accent/20"
            >
              <Link to="/book">
                Get Your Free Estimate
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 text-base active:scale-[0.97] transition-transform"
              onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Services
            </Button>
          </div>

          <TrustBadges variant="muted" className="justify-start pt-2" />

          {/* Animated stats */}
          <div className="flex flex-wrap gap-6 sm:gap-8 pt-2">
            <AnimatedCounter end={200} suffix="+" label="Nashville families" />
            <AnimatedCounter end={4.9} suffix="★" label="Average rating" decimals={1} />
            <AnimatedCounter end={5} prefix="" suffix=" hrs" label="Saved weekly" />
          </div>
        </div>
      </div>
    </section>
  );
}
