import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Receipt, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Expense {
  id: string;
  employee_id: string;
  amount: number;
  category: string;
  description: string;
  receipt_url: string | null;
  status: string;
  submitted_at: string;
  notes: string | null;
  employees?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ExpensesSection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("expenses").select("*, employees(name)").order("submitted_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Failed to load expenses."); return; }
    setExpenses((data || []) as any);
  };

  useEffect(() => { fetch_(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("expenses").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Failed to update."); return; }
    toast.success(`Expense ${status}.`);
    fetch_();
  };

  const filtered = expenses.filter(e => filterStatus === "all" || e.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />Employee Expenses</h3>
        <div className="flex gap-1">
          {["all", "pending", "approved", "rejected"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><p className="text-sm text-muted-foreground">No expenses found.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => (
            <div key={exp.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">{exp.description}</p>
                <p className="text-xs text-muted-foreground">{exp.employees?.name || "Unknown"} · {exp.category} · {format(new Date(exp.submitted_at), "MMM d, yyyy")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-sm text-foreground">${Number(exp.amount).toFixed(2)}</span>
                {exp.receipt_url && (
                  <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><ExternalLink className="h-3.5 w-3.5" /></a>
                )}
                <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[exp.status] || STATUS_STYLES.pending}`}>{exp.status}</span>
                {exp.status === "pending" && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(exp.id, "approved")} className="h-7 w-7 p-0 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(exp.id, "rejected")} className="h-7 w-7 p-0 text-red-600"><XCircle className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
