import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";

export default function Privacy() {
  const seo = getSEO("/privacy");
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seo.title} description={seo.description} keywords={seo.keywords} canonicalPath="/privacy" />
      <Navbar />

      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-primary">
        <div className="container max-w-3xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground -tracking-[0.02em]">Privacy Policy</h1>
          <p className="text-primary-foreground/60 mt-4 text-sm">Last updated: March 22, 2026</p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container max-w-3xl prose prose-sm sm:prose-base text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly when using our services, including:</p>
          <ul>
            <li><strong>Personal information:</strong> Name, email address, phone number, and home address</li>
            <li><strong>Service information:</strong> Home details, cleaning preferences, scheduling history, and feedback</li>
            <li><strong>Payment information:</strong> Payment method details processed securely through our payment provider</li>
            <li><strong>Communications:</strong> Messages, emails, and notes exchanged with our team</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Schedule, deliver, and improve our cleaning services</li>
            <li>Communicate with you about appointments, updates, and promotions</li>
            <li>Process payments and manage your account</li>
            <li>Respond to your questions and support requests</li>
            <li>Improve our website, services, and customer experience</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
          <ul>
            <li><strong>Service providers:</strong> Payment processors, scheduling tools, and communication platforms that help us operate our business</li>
            <li><strong>Team members:</strong> Our cleaning professionals receive necessary details (name, address, cleaning instructions) to perform their work</li>
            <li><strong>Legal requirements:</strong> When required by law, regulation, or legal process</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>

          <h2>5. Cookies & Analytics</h2>
          <p>Our website may use cookies and similar tracking technologies to improve your browsing experience and analyze site traffic. You can control cookie settings through your browser preferences. We may use third-party analytics services to understand how visitors use our site.</p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information (subject to legal retention requirements)</li>
            <li>Opt out of marketing communications at any time</li>
            <li>Request a copy of your data in a portable format</li>
          </ul>

          <h2>7. Data Retention</h2>
          <p>We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this policy. When information is no longer needed, we securely delete or anonymize it.</p>

          <h2>8. Children's Privacy</h2>
          <p>Our services are not directed to individuals under 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete it promptly.</p>

          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically.</p>

          <h2>10. Contact Us</h2>
          <p>If you have questions or concerns about this Privacy Policy or your personal information, please contact us:</p>
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
