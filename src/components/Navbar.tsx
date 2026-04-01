import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import oliveLogo from "@/assets/olive-clean-logo.png";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "/why-us", isRoute: true },
  { label: "Perks Club", href: "/perks", isRoute: true },
  { label: "Our Team", href: "/team", isRoute: true },
  { label: "About", href: "/about", isRoute: true },
  { label: "Client Login", href: "/client/login", isRoute: true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const scrollTo = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center">
          <img src={oliveLogo} alt="Olive Clean" className="h-8" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            (link as any).isRoute ? (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            )
          )}
        </div>

        <div className="hidden md:flex">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 active:scale-[0.97] transition-transform">
            <Link to="/book">Get Free Estimate</Link>
          </Button>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-foreground active:scale-95 transition-transform"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-t border-border animate-fade-in">
          <div className="container py-6 flex flex-col gap-4">
            {navLinks.map((link) =>
              (link as any).isRoute ? (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className="text-left text-base font-medium text-foreground py-2"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-left text-base font-medium text-foreground py-2"
                >
                  {link.label}
                </button>
              )
            )}
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full mt-2 active:scale-[0.97] transition-transform">
              <Link to="/book">Get Free Estimate</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
