import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 py-16">
      <div className="container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">O</span>
              </div>
              <div className="leading-none">
                <span className="text-lg font-semibold text-background tracking-tight">Olive</span>
                <span className="block text-[0.6rem] font-bold tracking-[0.25em] uppercase text-primary">Clean</span>
              </div>
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              Premium residential cleaning for Nashville's most discerning families.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-background text-sm mb-4">Services</h4>
            <ul className="space-y-2.5 text-sm text-background/60">
              <li>Essential Clean</li>
              <li>General Clean</li>
              <li>Signature Deep Clean</li>
              <li>Makeover Deep Clean</li>
            </ul>
          </div>

          {/* Areas */}
          <div>
            <h4 className="font-semibold text-background text-sm mb-4">Service Areas</h4>
            <ul className="space-y-2.5 text-sm text-background/60">
              <li>Belle Meade</li>
              <li>Brentwood</li>
              <li>Franklin</li>
              <li>Green Hills</li>
              <li>West Nashville</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-background text-sm mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" /> (615) 555-0142
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" /> hello@oliveclean.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" /> Nashville, TN
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-background/40">© {new Date().getFullYear()} Olive Clean. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-background/40">
            <Link to="/about" className="hover:text-background/60 transition-colors">About</Link>
            <Link to="/" className="hover:text-background/60 transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-background/60 transition-colors">Terms</Link>
            <Link to="/client/login" className="hover:text-background/60 transition-colors">Client Portal</Link>
            <Link to="/admin/login" className="hover:text-background/60 transition-colors">Staff Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
