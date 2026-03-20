import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Percent } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function PerksSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="perks" className="py-24 md:py-32 bg-muted/50">
      <div
        className={`container transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
        ref={ref}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-semibold tracking-widest uppercase text-olive-gold">Exclusive Program</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight -tracking-[0.02em]">
              The Olive Perks Club
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
              Be flexible with your schedule and save up to 60% on every cleaning. When a last-minute opening appears in your neighborhood, we'll text you first.
            </p>

            <div className="space-y-4 pt-2">
              {[
                { icon: Percent, text: "Save up to 60% on every visit" },
                { icon: Calendar, text: "We fill gaps — you get discounted cleanings" },
                { icon: Sparkles, text: "Same premium service, smarter scheduling" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-olive-gold/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-olive-gold" />
                  </div>
                  <p className="text-sm text-foreground font-medium">{item.text}</p>
                </div>
              ))}
            </div>

            <Button
              asChild
              className="rounded-full bg-olive-gold hover:bg-olive-gold/90 text-white px-8 mt-4 active:scale-[0.97] transition-transform shadow-lg shadow-olive-gold/15"
            >
              <Link to="/book">Join the Waitlist</Link>
            </Button>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-olive-gold/10 via-accent/5 to-primary/10 flex items-center justify-center border border-border/50">
              <div className="text-center space-y-4 p-8">
                <p className="text-6xl font-bold text-olive-gold tabular-nums">60%</p>
                <p className="text-lg font-semibold text-foreground">Maximum Savings</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  A quiet little win-win: we keep teams productive, you get premium cleaning at unbeatable prices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
