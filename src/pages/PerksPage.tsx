import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Gift, Users, Calendar, Star, TrendingUp, Percent, Check, Heart } from "lucide-react";
import TrustBadges from "@/components/TrustBadges";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";

const tiers = [
  {
    name: "Silver",
    frequency: "Monthly",
    discount: "5%",
    color: "border-border",
    badge: "bg-muted text-muted-foreground",
    perks: ["5% off every clean", "Priority scheduling", "Dedicated team", "Free rescheduling"],
  },
  {
    name: "Gold",
    frequency: "Bi-weekly",
    discount: "10%",
    color: "border-accent",
    badge: "bg-accent/10 text-accent",
    popular: true,
    perks: ["10% off every clean", "Priority scheduling", "Dedicated team", "Free rescheduling", "Complimentary dusting extras", "Referral bonus: $20"],
  },
  {
    name: "Platinum",
    frequency: "Weekly",
    discount: "20%",
    color: "border-primary",
    badge: "bg-primary/10 text-primary",
    perks: ["20% off every clean", "VIP priority scheduling", "Dedicated team", "Same-day rescheduling", "Free deep clean every quarter", "Priority phone support", "Referral bonus: $30", "Free cleanings at milestones"],
  },
];

const benefits = [
  { icon: Percent, title: "Save Up to 20%", description: "The more frequently you clean, the more you save. Platinum members unlock the deepest discounts." },
  { icon: Gift, title: "Free Cleanings", description: "Earn complimentary cleanings and bonus services as you hit milestones. Real rewards, not gimmicks." },
  { icon: Users, title: "Referral Bonuses", description: "Share the love! Refer a friend and you both receive credit toward your next cleaning." },
  { icon: Calendar, title: "Priority Scheduling", description: "Perks Club members get first access to preferred time slots, even during peak seasons." },
  { icon: Star, title: "Consistent Teams", description: "Your dedicated cleaning team knows your home, your preferences, and exactly how you like things done." },
  { icon: TrendingUp, title: "Flexibility Zone", description: "Need to reschedule? Members get same-day flexibility with no penalties or extra fees." },
];

export default function PerksPage() {
  const seo = getSEO("/perks");
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seo.title} description={seo.description} keywords={seo.keywords} canonicalPath="/perks" />
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
          <div
            className="grid gap-8"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}
          >
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

      {/* Membership Tiers */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-5xl space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-clamp-section font-bold text-foreground">Choose Your Tier</h2>
            <p className="text-muted-foreground">Your discount grows automatically based on your cleaning frequency.</p>
          </div>
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}
          >
            {tiers.map((t) => (
              <div key={t.name} className={`relative rounded-2xl border-2 ${t.color} bg-card p-6 space-y-4 ${t.popular ? "shadow-lg" : ""}`}>
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${t.badge}`}>
                    {t.name}
                  </span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{t.discount} <span className="text-base font-normal text-muted-foreground">off</span></p>
                  <p className="text-sm text-muted-foreground mt-1">{t.frequency} cleaning schedule</p>
                </div>
                <ul className="space-y-2">
                  {t.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link to="/book">Get Started</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Refer a Friend */}
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
              <Heart className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Give $20, Get $20</h2>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Love your clean home? Share it with friends and family! When your referral books their first cleaning, you both receive a <span className="font-semibold text-foreground">$20 credit</span> toward your next service.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 text-center max-w-md mx-auto">
              {[
                { step: "1", text: "Share your referral code" },
                { step: "2", text: "Friend books their first clean" },
                { step: "3", text: "You both get $20 off" },
              ].map((s) => (
                <div key={s.step} className="space-y-2">
                  <div className="w-8 h-8 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {s.step}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base">
              <Link to="/book">Book & Get Your Code <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
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
          <TrustBadges variant="light" className="mt-4" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
