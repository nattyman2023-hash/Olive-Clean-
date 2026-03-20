import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function CTASection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 md:py-32 bg-primary">
      <div
        className={`container text-center max-w-2xl transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
        ref={ref}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 -tracking-[0.02em]">
          Ready to Reclaim Your Time?
        </h2>
        <p className="text-primary-foreground/70 text-base mb-8 leading-relaxed">
          Schedule a free walkthrough and see how Olive Clean can transform your home — and your weekends.
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
      </div>
    </section>
  );
}
