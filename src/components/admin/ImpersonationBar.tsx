import { useAuth } from "@/hooks/useAuth";
import { X } from "lucide-react";

export default function ImpersonationBar() {
  const { impersonatedName, stopImpersonation, impersonatedRole } = useAuth();

  if (!impersonatedName) return null;

  return (
    <div className="bg-amber-400 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium sticky top-0 z-50">
      <span>
        You are currently viewing as <strong>{impersonatedName}</strong> ({impersonatedRole})
      </span>
      <button
        onClick={stopImpersonation}
        className="inline-flex items-center gap-1 bg-amber-600 text-amber-50 px-3 py-1 rounded-full text-xs font-semibold hover:bg-amber-700 active:scale-95 transition-all"
      >
        <X className="h-3 w-3" /> Return to Admin
      </button>
    </div>
  );
}
