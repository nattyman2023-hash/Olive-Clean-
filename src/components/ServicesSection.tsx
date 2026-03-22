import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const services = [
  {
    name: "The Essential Clean",
    slug: "essential",
    price: "$120",
    description: "Basic maintenance for regularly cleaned homes.",
    features: ["Surface dusting", "Floor vacuuming & mopping", "Trash removal", "Kitchen & bath wipe-down"],
    popular: false,
  },
  {
    name: "General Clean",
    slug: "general",
    price: "$180",
    description: "Routine standard for a consistently fresh home.",
    features: ["Everything in Essential", "Decorative item dusting", "Appliance exteriors", "Spot cleaning walls", "Mirror polishing"],
    popular: false,
  },
  {
    name: "Signature Deep Clean",
    slug: "deep-clean",
    price: "$320",
    description: "Deluxe detail for homes needing extra attention.",
    features: ["Everything in General", "Inside appliances", "Window interiors", "Baseboards & door frames", "Light fixture dusting"],
    popular: true,
  },
  {
    name: "Makeover Deep Clean",
    slug: "makeover",
    price: "$450+",
    description: "The full premium treatment, tailored to you.",
    features: ["Everything in Signature", "Polishing fixtures", "Hand-washing blinds", "Custom priority tasks", "Cabinet interiors"],
    popular: false,
  },
];

export default function ServicesSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="services" className="py-24 md:py-32 bg-background">
      <div className="container" ref={ref}>
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Our Services</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight -tracking-[0.02em]">
            Cleaning Packages for Every Home
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            From quick refreshes to top-to-bottom transformations. Every visit uses eco-friendly, non-toxic products safe for kids and pets.
          </p>
        </div>

        <div
          className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {services.map((service, i) => (
            <div
              key={service.name}
              className={`relative rounded-2xl p-6 flex flex-col transition-shadow duration-300 hover:shadow-xl ${
                service.popular
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15 ring-2 ring-primary"
                  : "bg-card text-card-foreground border border-border shadow-sm"
              }`}
              style={{ transitionDelay: isVisible ? `${i * 80}ms` : "0ms" }}
            >
              {service.popular && (
                <span className="absolute -top-3 left-6 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
                <p className={`text-sm ${service.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {service.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold tabular-nums">{service.price}</span>
                <span className={`text-sm ml-1 ${service.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  / visit
                </span>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {service.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${service.popular ? "text-accent" : "text-primary"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`rounded-full w-full active:scale-[0.97] transition-transform ${
                  service.popular
                    ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                }`}
              >
                <Link to="/book">Book Now</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
