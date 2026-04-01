import { ShieldCheck, Leaf, Lock } from "lucide-react";

const badges = [
  { icon: ShieldCheck, label: "Background Checked" },
  { icon: Lock, label: "Fully Insured" },
  { icon: Leaf, label: "Eco-Friendly" },
];

interface TrustBadgesProps {
  variant?: "light" | "dark" | "muted";
  className?: string;
}

export default function TrustBadges({ variant = "muted", className = "" }: TrustBadgesProps) {
  const colorMap = {
    light: "text-primary-foreground/60",
    dark: "text-background/50",
    muted: "text-muted-foreground",
  };

  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 ${className}`}>
      {badges.map((b) => (
        <div key={b.label} className={`flex items-center gap-1.5 text-xs font-medium ${colorMap[variant]}`}>
          <b.icon className="h-3.5 w-3.5" />
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
