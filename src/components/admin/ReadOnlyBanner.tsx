import { Lock } from "lucide-react";

export default function ReadOnlyBanner({ readOnly }: { readOnly: boolean }) {
  if (!readOnly) return null;
  return (
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg px-4 py-2.5 mb-4">
      <Lock className="h-4 w-4 shrink-0" />
      <p className="text-xs font-medium">Read-only — you have view access to this section</p>
    </div>
  );
}
