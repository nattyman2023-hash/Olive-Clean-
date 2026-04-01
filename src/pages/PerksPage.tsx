import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Gift, Users, Calendar, Star, TrendingUp, Percent } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";

const tiers = [
  { cleanings: "5+", discount: "10%", extras: "Priority scheduling" },
  { cleanings: "10+", discount: "15%", extras: "Free complimentary dusting" },
  { cleanings: "20+", discount: "20%", extras: "Free deep clean every quarter" },
  { cleanings: "40+", discount: "40%", extras: "VIP status + free cleanings earned" },
];

const benefits = [
  { icon: Percent, title: "Save Up to 40%", description: "The more you clean, the more you save. Loyalty members unlock escalating discounts with every visit." },
  { icon: Gift, title: "Free Cleanings", description: "Earn complimentary cleanings and bonus services as you hit milestones. Real rewards, not gimmicks." },
  { icon: Users, title: "Referral Bonuses", description: "Share the love! Refer a friend and you both receive a free cleaning session when they book." },
  { icon: Calendar, title: "Priority Scheduling", description: "Perks Club members get first access to preferred time slots, even during peak seasons." },
  { icon: Star, title: "Consistent Teams", description: "Your dedicated cleaning team knows your home, your preferences, and exactly how you like things done." },
  { icon: TrendingUp, title: "Flexibility Zone", description: "Need to reschedule? Members get same-day flexibility with no penalties or extra fees." },
];

export default function PerksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-primary">
        <div className="container max-w-3xl text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-foreground/60">Perks Club</span>
          <h1 className="text-clamp-hero font-bold text-primary-foreground -tracking-[0.02em]">
            The More You Clean, The More You Save
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
            Join the Olive Clean Perks Club and unlock exclusive discounts, free cleanings, and priority service — just for being a loyal client.
          </p>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <h2 className="text-clamp-section font-bold text-foreground text-center mb-12">Member Benefits</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
                <b.icon className="h-8 w-8 text-accent" />
                <h3 className="font-semibold text-foreground">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Savings Tiers */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-3xl space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-clamp-section font-bold text-foreground">Savings Tiers</h2>
            <p className="text-muted-foreground">Your discount grows automatically as you reach each milestone.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {tiers.map((t) => (
              <div key={t.cleanings} className="rounded-2xl border border-border bg-card p-6 space-y-2">
                <p className="text-2xl font-bold text-primary">{t.discount} off</p>
                <p className="text-sm font-medium text-foreground">{t.cleanings} cleanings completed</p>
                <p className="text-xs text-muted-foreground">{t.extras}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="container max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-primary-foreground">Start Earning Perks Today</h2>
          <p className="text-primary-foreground/70">Book your first cleaning and you're automatically enrolled. It's that simple.</p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base">
            <Link to="/book">Book Your First Clean <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
