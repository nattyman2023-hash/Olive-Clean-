import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-primary">
        <div className="container max-w-3xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground -tracking-[0.02em]">Terms of Service</h1>
          <p className="text-primary-foreground/60 mt-4 text-sm">Last updated: March 22, 2026</p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container max-w-3xl prose prose-sm sm:prose-base text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using the services provided by Olive Clean ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

          <h2>2. Services</h2>
          <p>Olive Clean provides residential cleaning services in the Nashville, Tennessee metropolitan area. Our services include but are not limited to Essential Cleans, General Cleans, Signature Deep Cleans, and Makeover Deep Cleans. Service availability, pricing, and scope may vary based on location and home size.</p>

          <h2>3. Booking & Scheduling</h2>
          <p>All bookings are subject to availability. We will confirm your appointment via email or phone. You may reschedule or cancel your appointment with at least 24 hours' notice without penalty. Cancellations made less than 24 hours before a scheduled appointment may be subject to a cancellation fee of up to 50% of the service cost.</p>

          <h2>4. Pricing & Payment</h2>
          <p>Prices listed on our website are estimates and may vary based on the actual scope of work determined during an initial walkthrough. Final pricing will be confirmed before service begins. Payment is due upon completion of service unless otherwise agreed in writing. We accept major credit cards, debit cards, and digital payment methods.</p>

          <h2>5. Client Responsibilities</h2>
          <ul>
            <li>Ensure safe access to your home at the scheduled time</li>
            <li>Secure or remove fragile, valuable, or irreplaceable items before our arrival</li>
            <li>Inform us of any special cleaning requirements, allergies, or access instructions</li>
            <li>Ensure pets are secured or confined during the cleaning appointment</li>
          </ul>

          <h2>6. Satisfaction Guarantee</h2>
          <p>We stand behind the quality of our work. If you are not satisfied with any aspect of your cleaning, please contact us within 24 hours and we will re-clean the affected areas at no additional charge.</p>

          <h2>7. Liability & Insurance</h2>
          <p>Olive Clean carries general liability insurance and bonding for all team members. In the unlikely event of damage to your property during a cleaning, please notify us within 48 hours. We will assess the situation and work with you on a fair resolution. Our liability is limited to the direct cost of repair or replacement, not exceeding the value of the cleaning service provided.</p>

          <h2>8. Perks Club Program</h2>
          <p>Our Perks Club offers scheduling flexibility and discounts to enrolled members. Perks Club benefits, terms, and discount levels may be modified at our discretion with reasonable notice to members. Enrollment is voluntary and can be cancelled at any time.</p>

          <h2>9. Privacy</h2>
          <p>Your use of our services is also governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, which describes how we collect, use, and protect your personal information.</p>

          <h2>10. Modifications</h2>
          <p>We reserve the right to update these Terms of Service at any time. Changes will be posted on this page with an updated "Last updated" date. Continued use of our services after changes constitutes acceptance of the updated terms.</p>

          <h2>11. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of Tennessee, without regard to its conflict of law provisions.</p>

          <h2>12. Contact</h2>
          <p>If you have questions about these Terms of Service, please contact us at:</p>
          <ul>
            <li>Email: hello@oliveclean.com</li>
            <li>Phone: (615) 555-0142</li>
            <li>Location: Nashville, TN</li>
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
