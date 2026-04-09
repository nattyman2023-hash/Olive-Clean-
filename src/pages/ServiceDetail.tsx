import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SEOHead from "@/components/SEOHead";
import { getSEO, SITE_URL } from "@/lib/seo";

const services: Record<string, {
  name: string;
  tagline: string;
  price: string;
  description: string;
  idealFor: string;
  features: string[];
  details: string[];
  faqs: { q: string; a: string }[];
}> = {
  essential: {
    name: "The Essential Clean",
    tagline: "A quick refresh to keep things tidy",
    price: "$120",
    description: "Our Essential Clean is designed for homes that are already well-maintained and just need a routine touch-up. Perfect for clients on a bi-weekly or weekly schedule who want their space to stay consistently fresh without a full deep dive.",
    idealFor: "Busy families and professionals who maintain a clean home but need regular help with the basics — dusting, vacuuming, mopping, and surface sanitizing.",
    features: ["Surface dusting of all reachable areas", "Vacuuming all floors and rugs", "Mopping hard floors", "Trash removal and bag replacement", "Kitchen counter and sink wipe-down", "Bathroom surface sanitization", "Mirror and glass spot-cleaning", "Light tidying of common areas"],
    details: ["Estimated duration: 1.5–2 hours", "Eco-friendly, non-toxic products included", "Safe for kids and pets", "Available weekly, bi-weekly, or monthly"],
    faqs: [
      { q: "How long does an Essential Clean take?", a: "Typically 1.5 to 2 hours depending on home size and condition." },
      { q: "Is this enough for a home that hasn't been cleaned recently?", a: "We recommend starting with a Signature or Makeover Deep Clean first, then transitioning to Essential for maintenance." },
      { q: "Do I need to provide cleaning supplies?", a: "No — our team brings all eco-friendly, non-toxic products and equipment." },
      { q: "Can I customize what's included?", a: "The Essential package covers the basics. For custom priorities, consider our General or Signature plans." },
    ],
  },
  general: {
    name: "General Clean",
    tagline: "The standard for a consistently fresh home",
    price: "$180",
    description: "Our General Clean goes beyond the basics to give your home a thorough, top-to-bottom routine cleaning. It's the sweet spot between a quick refresh and a full deep clean — ideal for most households on a regular schedule.",
    idealFor: "Families who want a noticeably clean home every visit, with attention to details like appliance exteriors, decorative items, and light fixtures.",
    features: ["Everything in the Essential Clean", "Detailed dusting of decorative items and shelves", "Appliance exterior cleaning (oven, fridge, dishwasher)", "Spot-cleaning walls and light switches", "Mirror and glass polishing throughout", "Ceiling fan blade dusting", "Door and door frame wipe-down", "Detailed bathroom scrub including grout"],
    details: ["Estimated duration: 2–3 hours", "Eco-friendly, non-toxic products included", "Safe for kids and pets", "Available weekly, bi-weekly, or monthly"],
    faqs: [
      { q: "What's the difference between Essential and General?", a: "General adds detailed dusting, appliance exteriors, spot-cleaning walls, and a more thorough bathroom scrub." },
      { q: "How often should I schedule a General Clean?", a: "Most clients book bi-weekly. Weekly is great for larger households or homes with pets." },
      { q: "Can I switch between Essential and General?", a: "Absolutely. Many clients alternate between the two based on their schedule and needs." },
      { q: "Do you move furniture to clean behind it?", a: "Light furniture is moved when safe. For heavy pieces, we clean around and as far as we can reach." },
    ],
  },
  "deep-clean": {
    name: "Signature Deep Clean",
    tagline: "Deluxe detail for homes that deserve extra care",
    price: "$320",
    description: "Our most popular package. The Signature Deep Clean is a comprehensive, room-by-room reset that tackles the areas most cleanings miss. Inside appliances, window interiors, baseboards, and beyond — this is the clean that makes your home feel brand new.",
    idealFor: "Homeowners preparing for guests, seasonal refreshes, move-in/move-out situations, or anyone who wants a premium level of cleanliness.",
    features: ["Everything in the General Clean", "Inside oven and microwave cleaning", "Inside refrigerator cleaning", "Interior window washing", "Baseboard and crown molding detail", "Door frame and trim dusting", "Light fixture and chandelier cleaning", "Cabinet exterior deep-wipe", "Vent and register dusting", "Detailed shower and tub scrub"],
    details: ["Estimated duration: 4–6 hours", "Eco-friendly, non-toxic products included", "Safe for kids and pets", "Recommended quarterly or as-needed"],
    faqs: [
      { q: "How is this different from the General Clean?", a: "The Signature goes inside appliances, cleans windows, tackles baseboards, and addresses areas that routine cleans don't cover." },
      { q: "How often should I get a Signature Deep Clean?", a: "We recommend quarterly for most homes, or before/after special occasions." },
      { q: "Can I book this as a one-time service?", a: "Yes! Many clients start with a Signature Deep Clean and then transition to General or Essential for ongoing maintenance." },
      { q: "Do you clean inside the oven?", a: "Yes — we clean inside the oven, microwave, and refrigerator as part of the Signature package." },
    ],
  },
  makeover: {
    name: "Makeover Deep Clean",
    tagline: "The full premium treatment, tailored to you",
    price: "$450+",
    description: "Our most comprehensive offering. The Makeover Deep Clean is a fully customizable, white-glove experience designed for homes that need extraordinary attention. Whether it's post-renovation, a seasonal overhaul, or simply the highest standard of clean — this is it.",
    idealFor: "Luxury homeowners, post-construction or renovation cleanups, estate preparation, and anyone who wants every corner of their home pristine.",
    features: ["Everything in the Signature Deep Clean", "Hand-polishing all fixtures and hardware", "Hand-washing blinds and window treatments", "Cabinet interior cleaning and organizing", "Custom priority task list (you choose what matters most)", "Detailed closet and pantry cleaning", "Wall washing (full walls, not just spots)", "Garage or bonus room add-on available", "Laundry folding and linen changing"],
    details: ["Estimated duration: 6–10 hours (may span multiple visits)", "Eco-friendly, non-toxic products included", "Safe for kids and pets", "Custom pricing based on scope — starting at $450"],
    faqs: [
      { q: "Why does the price say $450+?", a: "Every Makeover is custom-scoped. We provide a free walkthrough and detailed quote before scheduling." },
      { q: "Can this be split across multiple days?", a: "Yes — for larger homes, we often recommend spreading the work across 2 visits for the best results." },
      { q: "Do I get to choose what's prioritized?", a: "Absolutely. You'll create a custom priority list with your cleaning specialist during the walkthrough." },
      { q: "Is this available as a recurring service?", a: "It can be, though most clients use it as a one-time reset and then transition to a Signature or General plan." },
    ],
  },
};

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = slug ? services[slug] : undefined;

  if (!service) return <Navigate to="/" replace />;

  const seo = getSEO(`/services/${slug}`);
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.name,
    "description": service.description,
    "provider": { "@type": "Organization", "name": "Olive Clean", "url": SITE_URL },
    "areaServed": { "@type": "City", "name": "Nashville" },
    "offers": { "@type": "Offer", "price": service.price.replace(/[^0-9]/g, ""), "priceCurrency": "USD" },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": service.faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": `${SITE_URL}/#services` },
      { "@type": "ListItem", "position": 3, "name": service.name },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seo.title} description={seo.description} keywords={seo.keywords} canonicalPath={`/services/${slug}`} jsonLd={[serviceSchema, faqSchema, breadcrumbSchema]} />
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-primary">
        <div className="container max-w-3xl text-center space-y-4">
          <Link to="/#services" className="inline-flex items-center gap-1 text-sm text-primary-foreground/60 hover:text-primary-foreground/80 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Services
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground -tracking-[0.02em]">{service.name}</h1>
          <p className="text-primary-foreground/70 text-lg">{service.tagline}</p>
          <div className="pt-2">
            <span className="text-4xl md:text-5xl font-bold text-primary-foreground tabular-nums">{service.price}</span>
            <span className="text-primary-foreground/60 ml-2">/ visit</span>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl space-y-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">About This Service</h2>
            <p className="text-muted-foreground leading-relaxed">{service.description}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ideal For</h2>
            <p className="text-muted-foreground leading-relaxed">{service.idealFor}</p>
          </div>

          {/* What's Included */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">What's Included</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {service.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Details</h2>
            <ul className="space-y-2">
              {service.details.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {service.faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-foreground">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="container max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to Book Your {service.name}?</h2>
          <p className="text-primary-foreground/70">Schedule a free walkthrough and get a personalized quote for your home.</p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base">
            <Link to="/book">
              Get Free Estimate <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
