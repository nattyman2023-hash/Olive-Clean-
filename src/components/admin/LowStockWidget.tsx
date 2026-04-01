import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

export default function LowStockWidget() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const { data } = await supabase.from("supply_items").select("id, current_stock, reorder_threshold");
    const low = (data || []).filter((i: any) => i.current_stock <= i.reorder_threshold);
    setCount(low.length);
  };

  useEffect(() => {
    fetchCount();
    const channel = supabase
      .channel("low-stock-widget")
      .on("postgres_changes", { event: "*", schema: "public", table: "supply_items" }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (count === 0) return null;

  return (
    <button
      onClick={() => {
        const tab = document.querySelector('[data-state][value="supplies"]') as HTMLElement;
        if (tab) tab.click();
      }}
      className="w-full mb-6 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 flex items-center gap-3 hover:bg-destructive/15 transition-colors text-left"
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{count} Low Stock Alert{count !== 1 ? "s" : ""}</p>
        <p className="text-xs opacity-80">Click to review supply levels</p>
      </div>
    </button>
  );
}
