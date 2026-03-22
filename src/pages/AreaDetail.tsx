import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, MapPin, Sparkles, Shield, Leaf } from "lucide-react";

const areas: Record<string, {
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  services: string[];
}> = {
  "belle-meade": {
    name: "Belle Meade",
    tagline: "Premium cleaning for Nashville's most prestigious neighborhood",
    description: "Belle Meade is home to some of Nashville's finest estates and historic properties. Our team understands the unique needs of these homes — from delicate antique surfaces to expansive square footage. We bring the care and attention your Belle Meade home deserves, with eco-friendly products safe for families, pets, and heritage finishes.",
    highlights: [
      "Experienced with historic and luxury estate cleaning",
      "Familiar with gated community access procedures",
      "Flexible scheduling around your household staff",
      "Custom cleaning plans for large-format homes",
    ],
    services: ["Essential Clean", "General Clean", "Signature Deep Clean", "Makeover Deep Clean"],
  },
  brentwood: {
    name: "Brentwood",
    tagline: "Trusted cleaning services for Brentwood families",
    description: "Brentwood's beautiful family neighborhoods deserve a cleaning service that treats every home with respect. Whether you're in a cozy subdivision or a sprawling property off Concord Road, our Brentwood team delivers consistent, reliable cleaning with products that are safe for your kids and pets.",
    highlights: [
      "Serving Brentwood neighborhoods for years",
      "Family-focused with kid- and pet-safe products",
      "Consistent teams so you see familiar faces",
      "Convenient scheduling for busy family routines",
    ],
    services: ["Essential Clean", "General Clean", "Signature Deep Clean", "Makeover Deep Clean"],
  },
  franklin: {
    name: "Franklin",
    tagline: "Exceptional cleaning for Franklin's charming homes",
    description: "From the historic homes of downtown Franklin to the modern developments in Berry Farms and Westhaven, we serve Franklin with the same attention to detail that makes this community special. Our Franklin cleaning teams know the area well and deliver the premium Olive Clean experience every visit.",
    highlights: [
      "Covering all Franklin neighborhoods and developments",
      "Experienced with both historic and new-build homes",
      "Green cleaning products that match Franklin's values",
      "Flexible plans from weekly to one-time deep cleans",
    ],
    services: ["Essential Clean", "General Clean", "Signature Deep Clean", "Makeover Deep Clean"],
  },
  "green-hills": {
    name: "Green Hills",
    tagline: "Reliable, premium cleaning in the heart of Nashville",
    description: "Green Hills is one of Nashville's most vibrant neighborhoods, and our cleaning teams are proud to serve its mix of classic homes and modern residences. Whether you're near the Mall at Green Hills or tucked away on a quiet street, we bring a professional, thorough clean every time.",
    highlights: [
      "Quick response times in central Nashville",
      "Experienced with condos, townhomes, and houses",
      "Trusted by Green Hills residents for years",
      "Same-week availability for new clients",
    ],
    services: ["Essential Clean", "General Clean", "Signature Deep Clean", "Makeover Deep Clean"],
  },
  "west-nashville": {
    name: "West Nashville",
    tagline: "Modern cleaning for Nashville's creative west side",
    description: "West Nashville's eclectic mix of new builds, renovated bungalows, and creative spaces calls for a cleaning service that's just as adaptable. Our West Nashville teams are experienced with everything from Sylvan Park cottages to The Nations' contemporary homes, delivering a clean that fits your lifestyle.",
    highlights: [
      "Familiar with West Nashville's diverse home styles",
      "Flexible scheduling for creative professionals",
      "Eco-friendly products that align with the community",
      "Quick booking and responsive communication",
    ],
    services: ["Essential Clean", "General Clean", "Signature Deep Clean", "Makeover Deep Clean"],
  },
};

const serviceSlugMap: Record<string, string> = {
  "Essential Clean": "essential",
  "General Clean": "general",
  "Signature Deep Clean": "deep-clean",
  "Makeover Deep Clean": "makeover",
};

export default function AreaDetail() {
  const { slug } = useParams<{ slug: string }>();
  const area = slug ? areas[slug] : undefined;

  if (!area) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-primary">
        <div className="container max-w-3xl text-center space-y-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary-foreground/60 hover:text-primary-foreground/80 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center justify-center gap-2 text-primary-foreground/60">
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-widest">Service Area</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground -tracking-[0.02em]">{area.name}</h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">{area.tagline}</p>
        </div>
      </section>

      {/* About the area */}
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl space-y-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Cleaning Services in {area.name}</h2>
            <p className="text-muted-foreground leading-relaxed">{area.description}</p>
          </div>

          {/* Highlights */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Why {area.name} Residents Choose Us</h2>
            <ul className="space-y-3">
              {area.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 text-foreground">
                  <Sparkles className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <span className="text-sm">{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Values */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <Leaf className="h-8 w-8 text-primary" />
              <h3 className="font-semibold text-foreground">Eco-Friendly Products</h3>
              <p className="text-sm text-muted-foreground">Every product we use is non-toxic, biodegradable, and safe for children and pets.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <Shield className="h-8 w-8 text-primary" />
              <h3 className="font-semibold text-foreground">Insured & Vetted</h3>
              <p className="text-sm text-muted-foreground">All team members are background-checked, insured, and professionally trained.</p>
            </div>
          </div>

          {/* Available Services */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Available Services in {area.name}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {area.services.map((s) => (
                <Link
                  key={s}
                  to={`/services/${serviceSlugMap[s]}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow group"
                >
                  <span className="font-medium text-foreground text-sm">{s}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="container max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-primary-foreground">Get a Free Estimate in {area.name}</h2>
          <p className="text-primary-foreground/70">We'll schedule a walkthrough at your convenience and provide a personalized cleaning plan.</p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base">
            <Link to="/book">
              Book Now <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
