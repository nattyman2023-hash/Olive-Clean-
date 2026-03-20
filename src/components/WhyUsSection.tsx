import { Shield, Leaf, MapPin, Heart, Clock, Users } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const features = [
  {
    icon: Shield,
    title: "Bonded & Insured",
    desc: "Full liability coverage and bonding for every team member. Your home is protected.",
  },
  {
    icon: Users,
    title: "Background-Checked Teams",
    desc: "Rigorous vetting, reference checks, and ongoing performance reviews for your safety.",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly Products",
    desc: "100% non-toxic, child-safe, and pet-safe cleaning solutions. Healthy home, healthy planet.",
  },
  {
    icon: MapPin,
    title: "Nashville Neighborhoods",
    desc: "Proudly serving Belle Meade, Brentwood, Franklin, Green Hills, and surrounding areas.",
  },
  {
    icon: Heart,
    title: "We Remember Everything",
    desc: "Your preferences, routines, and home details — saved so every visit feels personalized.",
  },
  {
    icon: Clock,
    title: "Reliable Scheduling",
    desc: "Consistent teams, on-time arrivals, and flexible rescheduling when life happens.",
  },
];

export default function WhyUsSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="why-us" className="py-24 md:py-32 bg-muted/50">
      <div className="container" ref={ref}>
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Why Olive Clean</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight -tracking-[0.02em]">
            Built on Trust, Delivered with Care
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            We're not just a cleaning service — we're your partner in creating a home that feels like a sanctuary.
          </p>
        </div>

        <div
          className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg border border-border/50 transition-shadow duration-300"
              style={{ transitionDelay: isVisible ? `${i * 70}ms` : "0ms" }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
