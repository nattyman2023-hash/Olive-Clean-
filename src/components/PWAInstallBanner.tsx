import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner({ mode = "banner" }: { mode?: "banner" | "link" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  // Footer link mode for admin/employee
  if (mode === "link") {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 text-xs py-1 hover:text-background/60 transition-colors text-background/40"
      >
        <Download className="h-3 w-3" />
        Download App
      </button>
    );
  }

  // Banner mode for clients — don't show if dismissed or no prompt available
  if (dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 shadow-lg safe-bottom">
      <div className="container flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Download className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium truncate">Install Olive Clean for quick access</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 text-xs active:scale-[0.97] transition-transform"
          >
            Install
          </Button>
          <button onClick={() => setDismissed(true)} className="p-1 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
