import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TrustBadges from "@/components/TrustBadges";
import nashvilleHero from "@/assets/nashville-home-hero.jpg";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 md:pt-0 overflow-hidden">
      {/* Parallax background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat md:bg-fixed"
        style={{ backgroundImage: `url(${nashvilleHero})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />

      <div className="container relative z-10">
        <div className="max-w-2xl space-y-8">
          <div className="inline-block">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 px-4 py-2 rounded-full">
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
              className="rounded-full px-8 text-base active:scale-[0.97] transition-transform bg-background/60 backdrop-blur-sm"
              onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Services
            </Button>
          </div>

          <TrustBadges variant="muted" className="justify-start pt-2" />

          {/* Quick stats */}
          <div className="flex gap-8 pt-2">
            {[
              { value: "4–6 hrs", label: "Saved weekly" },
              { value: "200+", label: "Nashville families" },
              { value: "4.9★", label: "Average rating" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-bold text-foreground tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
