import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import ServicesSection from "@/components/ServicesSection";
import WhyUsSection from "@/components/WhyUsSection";
import TimeSavedCalculator from "@/components/TimeSavedCalculator";
import PerksSection from "@/components/PerksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { getSEO, SITE_URL } from "@/lib/seo";

const Index = () => {
  const seo = getSEO("/");

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Olive Clean",
    "description": seo.description,
    "url": SITE_URL,
    "telephone": "(615) 555-0142",
    "email": "hello@oliveclean.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nashville",
      "addressRegion": "TN",
      "addressCountry": "US",
    },
    "areaServed": [
      { "@type": "City", "name": "Nashville" },
      { "@type": "City", "name": "Brentwood" },
      { "@type": "City", "name": "Franklin" },
    ],
    "priceRange": "$120 - $450+",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "127",
    },
    "sameAs": [],
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Olive Clean",
    "url": SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/book?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-screen">
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonicalPath="/"
        jsonLd={[localBusinessSchema, webSiteSchema]}
      />
      <Navbar />
      <PWAInstallBanner mode="banner" />
      <HeroSection />
      <ServicesSection />
      <WhyUsSection />
      <TimeSavedCalculator />
      <PerksSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
