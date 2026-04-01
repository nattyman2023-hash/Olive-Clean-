import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
import oliveLogo from "@/assets/olive-clean-logo.png";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 py-10 sm:py-16">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
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
              <li><Link to="/services/essential" className="hover:text-background/80 transition-colors">Essential Clean</Link></li>
              <li><Link to="/services/general" className="hover:text-background/80 transition-colors">General Clean</Link></li>
              <li><Link to="/services/deep-clean" className="hover:text-background/80 transition-colors">Signature Deep Clean</Link></li>
              <li><Link to="/services/makeover" className="hover:text-background/80 transition-colors">Makeover Deep Clean</Link></li>
            </ul>
          </div>

          {/* Areas */}
          <div>
            <h4 className="font-semibold text-background text-sm mb-4">Service Areas</h4>
            <ul className="space-y-2.5 text-sm text-background/60">
              <li><Link to="/areas/belle-meade" className="hover:text-background/80 transition-colors">Belle Meade</Link></li>
              <li><Link to="/areas/brentwood" className="hover:text-background/80 transition-colors">Brentwood</Link></li>
              <li><Link to="/areas/franklin" className="hover:text-background/80 transition-colors">Franklin</Link></li>
              <li><Link to="/areas/green-hills" className="hover:text-background/80 transition-colors">Green Hills</Link></li>
              <li><Link to="/areas/west-nashville" className="hover:text-background/80 transition-colors">West Nashville</Link></li>
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

        <div className="border-t border-background/10 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col items-center gap-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:gap-6 text-xs text-background/40">
            <Link to="/about" className="py-1 hover:text-background/60 transition-colors">About</Link>
            <Link to="/careers" className="py-1 hover:text-background/60 transition-colors">Careers</Link>
            <Link to="/privacy" className="py-1 hover:text-background/60 transition-colors">Privacy</Link>
            <Link to="/terms" className="py-1 hover:text-background/60 transition-colors">Terms</Link>
            <Link to="/client/login" className="py-1 hover:text-background/60 transition-colors">Client Portal</Link>
            <Link to="/employee/login" className="py-1 hover:text-background/60 transition-colors">Employee Portal</Link>
            <Link to="/admin/login" className="py-1 hover:text-background/60 transition-colors col-span-2 sm:col-span-1 text-center sm:text-left">Staff Login</Link>
          </div>
          <p className="text-xs text-background/40">© {new Date().getFullYear()} Olive Clean. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
