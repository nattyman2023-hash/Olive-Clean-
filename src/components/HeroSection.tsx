import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 md:pt-0 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/60 to-background" />
      
      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-8">
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
                className="rounded-full px-8 text-base active:scale-[0.97] transition-transform"
                onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}
              >
                View Services
              </Button>
            </div>

            {/* Quick stats */}
            <div className="flex gap-8 pt-4">
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

          {/* Image Placeholder */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/10 flex items-center justify-center shadow-2xl shadow-primary/5 overflow-hidden">
              <div className="text-center p-8 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-3xl">🏡</span>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Lifestyle hero image<br />of a Nashville family
                </p>
              </div>
            </div>
            {/* Floating accent card */}
            <div className="absolute -bottom-4 -left-4 bg-card rounded-xl p-4 shadow-lg border border-border/50">
              <p className="text-xs text-muted-foreground">Eco-Friendly Products</p>
              <p className="text-sm font-semibold text-foreground">100% Non-Toxic</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
