import { useParams, Link, Navigate } from "react-router-dom";
import { useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles, Shield, Leaf, Star, Navigation } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { getSEO, SITE_URL } from "@/lib/seo";
import { useMapTilerKey } from "@/hooks/useMapTilerKey";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

interface AreaData {
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  services: string[];
  lat: number;
  lng: number;
  heroImage: string;
  landmarks: string[];
  testimonial: { quote: string; author: string; neighborhood: string };
  funFact: string;
}

const areas: Record<string, AreaData> = {
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
    lat: 36.0987,
    lng: -86.8572,
    heroImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
    landmarks: [
      "Minutes from Belle Meade Plantation",
      "Near Percy Warner Park & the Harpeth River Greenway",
      "Close to the Belle Meade Country Club",
      "Serving homes along Leake Avenue and Belle Meade Boulevard",
    ],
    testimonial: {
      quote: "Olive Clean treats our 1920s estate with the care it deserves. They know exactly which products to use on our antique woodwork. Absolutely impeccable service.",
      author: "Margaret T.",
      neighborhood: "Belle Meade",
    },
    funFact: "Belle Meade was once home to one of the most famous horse farms in America, and many of its grand homes date back over a century.",
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
    lat: 36.0331,
    lng: -86.7828,
    heroImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    landmarks: [
      "Serving families near Crockett Park & Deerwood Arboretum",
      "Close to the Maryland Farms business district",
      "Minutes from Cool Springs Galleria",
      "Covering neighborhoods along Concord Road and Murray Lane",
    ],
    testimonial: {
      quote: "With three kids and two dogs, our house is a battlefield by Friday. Olive Clean's team comes in and makes it feel brand new every single time.",
      author: "Jennifer & Mark S.",
      neighborhood: "Brentwood",
    },
    funFact: "Brentwood is consistently ranked one of the safest and best places to live in Tennessee, with top-rated schools and family-friendly parks.",
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
    lat: 35.9251,
    lng: -86.8689,
    heroImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
    landmarks: [
      "Serving homes near the Harpeth River and Natchez Trace",
      "Close to downtown Franklin's Main Street shops",
      "Covering Berry Farms, Westhaven & McKay's Mill",
      "Minutes from the Factory at Franklin",
    ],
    testimonial: {
      quote: "We moved into a new build in Westhaven and Olive Clean has kept it looking show-ready since day one. Love that they use green products!",
      author: "David R.",
      neighborhood: "Westhaven, Franklin",
    },
    funFact: "Franklin's Main Street has been named one of 'America's Favorite Main Streets' and hosts the beloved Pumpkinfest every October.",
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
    lat: 36.1048,
    lng: -86.8176,
    heroImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
    landmarks: [
      "Steps from the Mall at Green Hills",
      "Near Hillsboro Village & Belmont University",
      "Close to Bluebird Cafe and Lipscomb University",
      "Serving the Hillsboro-West End and Woodmont areas",
    ],
    testimonial: {
      quote: "I have a small condo near the Mall and Olive Clean makes it sparkle. They're always on time, always thorough, and the team is so friendly.",
      author: "Lisa K.",
      neighborhood: "Green Hills",
    },
    funFact: "Green Hills is home to the iconic Bluebird Cafe, where Taylor Swift was discovered and countless country hits have been born.",
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
    lat: 36.1580,
    lng: -86.8454,
    heroImage: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80",
    landmarks: [
      "Serving Sylvan Park, The Nations & Charlotte Park",
      "Near the Centennial Sportsplex & McCabe Park",
      "Close to West Nashville's 51st Avenue restaurants",
      "Covering homes along Charlotte Pike & Murphy Road",
    ],
    testimonial: {
      quote: "Our bungalow in Sylvan Park has tons of character — and tons of nooks to clean! Olive Clean gets into every corner. They're the best.",
      author: "Carlos & Nina M.",
      neighborhood: "Sylvan Park",
    },
    funFact: "The Nations neighborhood has transformed from a quiet industrial area into one of Nashville's hottest spots for dining, art, and new construction.",
  },
};

const serviceSlugMap: Record<string, string> = {
  "Essential Clean": "essential",
  "General Clean": "general",
  "Signature Deep Clean": "deep-clean",
  "Makeover Deep Clean": "makeover",
};

function AreaMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const { key, loading } = useMapTilerKey();
  const mapRef = useRef<HTMLDivElement>(null);

  if (loading || !key) {
    return (
      <div className="w-full h-72 md:h-96 rounded-2xl bg-muted animate-pulse flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden border border-border shadow-sm">
      <iframe
        title={`Map of ${name} service area`}
        src={`https://api.maptiler.com/maps/streets-v2/?key=${key}#13/${lat}/${lng}`}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default function AreaDetail() {
  const { slug } = useParams<{ slug: string }>();
  const area = slug ? areas[slug] : undefined;

  if (!area) return <Navigate to="/" replace />;

  const seo = getSEO(`/areas/${slug}`);
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `Olive Clean — ${area.name}`,
    "description": seo.description,
    "url": `${SITE_URL}/areas/${slug}`,
    "telephone": "(615) 555-0142",
    "email": "hello@oliveclean.com",
    "image": area.heroImage,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": area.name,
      "addressRegion": "TN",
      "addressCountry": "US",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": area.lat,
      "longitude": area.lng,
    },
    "areaServed": {
      "@type": "Place",
      "name": area.name,
    },
    "priceRange": "$120 - $450+",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "127",
    },
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Areas" },
    { label: area.name },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        ogImage={area.heroImage}
        canonicalPath={`/areas/${slug}`}
        jsonLd={[localBusinessSchema, breadcrumbJsonLd(breadcrumbItems)]}
      />
      <Navbar />

      {/* Hero with background image */}
      <section
        className="relative pt-28 pb-20 md:pt-36 md:pb-28"
        style={{
          backgroundImage: `linear-gradient(to bottom, hsl(var(--primary) / 0.85), hsl(var(--primary) / 0.92)), url(${area.heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container max-w-3xl text-center space-y-4 relative z-10">
          <Breadcrumbs items={breadcrumbItems} className="mb-4 justify-center" />
          <div className="flex items-center justify-center gap-2 text-primary-foreground/60">
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-widest">Service Area</span>
          </div>
          <h1 className="text-clamp-hero font-bold text-primary-foreground -tracking-[0.02em]">
            House Cleaning in {area.name}
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">{area.tagline}</p>
          <div className="pt-4">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base">
              <Link to="/book">
                Get Free Estimate <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About the area */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl space-y-16">
          {/* Description + Map side by side */}
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Cleaning Services in {area.name}</h2>
              <p className="text-muted-foreground leading-relaxed">{area.description}</p>
              <p className="text-sm text-muted-foreground/70 italic">{area.funFact}</p>
            </div>
            <AreaMap lat={area.lat} lng={area.lng} name={area.name} />
          </div>

          {/* Local landmarks */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" /> Neighborhoods We Serve
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {area.landmarks.map((l) => (
                <div key={l} className="flex items-start gap-3 bg-muted/50 rounded-xl p-4 border border-border">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span className="text-sm text-foreground">{l}</span>
                </div>
              ))}
            </div>
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

          {/* Testimonial */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-10">
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-5 w-5 fill-accent text-accent" />
              ))}
            </div>
            <blockquote className="text-foreground text-lg leading-relaxed italic mb-4">
              "{area.testimonial.quote}"
            </blockquote>
            <div className="text-sm">
              <span className="font-semibold text-foreground">{area.testimonial.author}</span>
              <span className="text-muted-foreground"> — {area.testimonial.neighborhood}</span>
            </div>
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
      <section
        className="py-16 md:py-24"
        style={{
          backgroundImage: `linear-gradient(to bottom, hsl(var(--primary) / 0.9), hsl(var(--primary))), url(${area.heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
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
