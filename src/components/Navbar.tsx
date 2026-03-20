import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-us" },
  { label: "Perks Club", href: "#perks" },
  { label: "Reviews", href: "#reviews" },
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
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">O</span>
          </div>
          <div className="leading-none">
            <span className="text-lg font-semibold text-foreground tracking-tight">Olive</span>
            <span className="block text-[0.6rem] font-bold tracking-[0.25em] uppercase text-primary">Clean</span>
          </div>
        </Link>

        {/* Desktop Links */}
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

        {/* Desktop CTA */}
        <div className="hidden md:flex">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 active:scale-[0.97] transition-transform">
            <Link to="/book">Get Free Estimate</Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-foreground active:scale-95 transition-transform"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
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
