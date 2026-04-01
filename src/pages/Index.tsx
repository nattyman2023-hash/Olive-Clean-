import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import WhyUsSection from "@/components/WhyUsSection";
import TimeSavedCalculator from "@/components/TimeSavedCalculator";
import PerksSection from "@/components/PerksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";

const Index = () => {
  const seo = getSEO("/");
  return (
    <div className="min-h-screen">
      <SEOHead title={seo.title} description={seo.description} keywords={seo.keywords} canonicalPath="/" />
      <Navbar />
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
