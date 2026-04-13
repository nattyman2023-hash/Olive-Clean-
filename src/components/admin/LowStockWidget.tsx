import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";

export default function LowStockWidget() {
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const fetchCount = async () => {
    const { data } = await supabase.from("supply_items").select("id, current_stock, reorder_threshold");
    const low = (data || []).filter((i: any) => i.current_stock <= i.reorder_threshold);
    setCount(low.length);
  };

  useEffect(() => {
    fetchCount();
    const channel = supabase
      .channel("low-stock-widget")
      .on("postgres_changes", { event: "*", schema: "public", table: "supply_items" }, () => {
        setDismissed(false);
        fetchCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (count === 0 || dismissed) return null;

  return (
    <div className="relative w-full mb-6 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 flex items-center gap-3">
      <button
        onClick={() => {
          const tab = document.querySelector('[data-state][value="supplies"]') as HTMLElement;
          if (tab) tab.click();
        }}
        className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity text-left"
      >
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{count} Low Stock Alert{count !== 1 ? "s" : ""}</p>
          <p className="text-xs opacity-80">Click to review supply levels</p>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        className="shrink-0 p-1 rounded-lg hover:bg-destructive/10 transition-colors"
        title="Dismiss for this session"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
