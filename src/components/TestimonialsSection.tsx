import { Star } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const testimonials = [
  {
    name: "Rachel M.",
    location: "Belle Meade",
    rating: 5,
    text: "They remembered that we have a new baby and adjusted their schedule around nap time. That kind of attention is priceless.",
  },
  {
    name: "David & Sarah K.",
    location: "Brentwood",
    rating: 5,
    text: "We've tried four cleaning services in Nashville. Olive Clean is the only one that's been consistent every single visit.",
  },
  {
    name: "Priya T.",
    location: "Green Hills",
    rating: 5,
    text: "The Perks Club is genius. I save almost half and my house has never been cleaner. Can't recommend enough.",
  },
];

export default function TestimonialsSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="reviews" className="py-24 md:py-32 bg-background">
      <div className="container" ref={ref}>
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">What Families Say</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground -tracking-[0.02em]">
            Trusted by Nashville Families
          </h2>
        </div>

        <div
          className={`grid md:grid-cols-3 gap-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="bg-card rounded-2xl p-8 border border-border/50 shadow-sm hover:shadow-lg transition-shadow duration-300"
              style={{ transitionDelay: isVisible ? `${i * 100}ms` : "0ms" }}
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-olive-gold text-olive-gold" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-6">"{t.text}"</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
