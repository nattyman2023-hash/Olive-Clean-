import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Receipt, CheckCircle2, XCircle, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  reviewed_at: string | null;
  reviewed_by: string | null;
  employees?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const CATEGORIES = ["gas", "supplies", "equipment", "maintenance", "other"];

export default function ExpensesSection({ readOnly, onNavigate }: { readOnly?: boolean; onNavigate?: (section: string, targetId?: string) => void }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [newExpense, setNewExpense] = useState({ employee_id: "", amount: "", category: "other", description: "", notes: "" });
  const [addSaving, setAddSaving] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("expenses").select("*, employees(name)").order("submitted_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Failed to load expenses."); return; }
    setExpenses((data || []) as any);
  };

  useEffect(() => { fetch_(); }, []);

  const loadEmployees = async () => {
    const { data } = await supabase.from("employees").select("id, name").order("name");
    setEmployees(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("expenses").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Failed to update."); return; }
    toast.success(`Expense ${status}.`);
    fetch_();
    if (selectedExpense?.id === id) {
      setSelectedExpense((prev) => prev ? { ...prev, status, reviewed_at: new Date().toISOString() } : null);
    }
  };

  const openDetail = (exp: Expense) => {
    setSelectedExpense(exp);
    setSheetOpen(true);
  };

  const handleAddExpense = async () => {
    if (!newExpense.employee_id || !newExpense.description || !newExpense.amount) {
      toast.error("Fill in required fields."); return;
    }
    setAddSaving(true);
    const { error } = await supabase.from("expenses").insert({
      employee_id: newExpense.employee_id,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      description: newExpense.description,
      notes: newExpense.notes || null,
      status: "approved",
      reviewed_at: new Date().toISOString(),
    });
    setAddSaving(false);
    if (error) { toast.error("Failed to add expense."); return; }
    toast.success("Expense added and approved.");
    setAddOpen(false);
    setNewExpense({ employee_id: "", amount: "", category: "other", description: "", notes: "" });
    fetch_();
  };

  const filtered = expenses.filter(e => filterStatus === "all" || e.status === filterStatus);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />Employee Expenses</h3>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            {["all", "pending", "approved", "rejected"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {!readOnly && (
            <Button size="sm" onClick={() => { setAddOpen(true); loadEmployees(); }} className="rounded-lg">
              <Plus className="h-4 w-4 mr-1" />Add Expense
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><p className="text-sm text-muted-foreground">No expenses found.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => (
            <div
              key={exp.id}
              className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openDetail(exp)}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">{exp.description}</p>
                <p className="text-xs text-muted-foreground">
                  <button onClick={(e) => { e.stopPropagation(); onNavigate?.("team", exp.employee_id); }} className="hover:text-primary hover:underline underline-offset-2">{exp.employees?.name || "Unknown"}</button>
                  {" · "}{exp.category} · {format(new Date(exp.submitted_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className="font-bold text-sm text-foreground">${Number(exp.amount).toFixed(2)}</span>
                {exp.receipt_url && (
                  <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><ExternalLink className="h-3.5 w-3.5" /></a>
                )}
                <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[exp.status] || STATUS_STYLES.pending}`}>{exp.status}</span>
                {!readOnly && exp.status === "pending" && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(exp.id, "approved")} className="h-7 w-7 p-0 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(exp.id, "rejected")} className="h-7 w-7 p-0 text-red-600"><XCircle className="h-4 w-4" /></Button>
                  </>
                )}
                {!readOnly && exp.status === "rejected" && (
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(exp.id, "pending")} className="h-7 text-xs text-amber-600">Re-evaluate</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense Detail Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Expense Detail</SheetTitle>
            <SheetDescription>Full breakdown and receipt</SheetDescription>
          </SheetHeader>

          {selectedExpense && (
            <div className="space-y-5 mt-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="text-2xl font-bold text-foreground">${Number(selectedExpense.amount).toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm font-medium text-foreground">{selectedExpense.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <Badge variant="outline" className="mt-1 capitalize">{selectedExpense.category}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className={`inline-block mt-1 text-[0.7rem] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[selectedExpense.status] || STATUS_STYLES.pending}`}>
                      {selectedExpense.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted by</p>
                    <p className="text-sm text-foreground">{selectedExpense.employees?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm text-foreground">{format(new Date(selectedExpense.submitted_at), "MMM d, yyyy h:mm a")}</p>
                  </div>
                </div>
                {selectedExpense.reviewed_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Reviewed</p>
                    <p className="text-sm text-foreground">{format(new Date(selectedExpense.reviewed_at), "MMM d, yyyy h:mm a")}</p>
                  </div>
                )}
                {selectedExpense.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm text-foreground">{selectedExpense.notes}</p>
                  </div>
                )}
              </div>

              {/* Receipt */}
              {selectedExpense.receipt_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Receipt</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <img
                      src={selectedExpense.receipt_url}
                      alt="Receipt"
                      className="w-full max-h-80 object-contain bg-muted/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                    <div className="hidden p-4 text-center">
                      <a href={selectedExpense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                        <ExternalLink className="h-3.5 w-3.5" /> Open Receipt
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!readOnly && selectedExpense.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(selectedExpense.id, "approved")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selectedExpense.id, "rejected")}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {!readOnly && selectedExpense.status === "rejected" && (
                <Button variant="outline" className="w-full" onClick={() => updateStatus(selectedExpense.id, "pending")}>
                  Re-evaluate (Set to Pending)
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Log an expense on behalf of a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Employee *</label>
              <select value={newExpense.employee_id} onChange={(e) => setNewExpense({ ...newExpense, employee_id: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount *</label>
                <Input type="number" step="0.01" placeholder="0.00" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description *</label>
              <Input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="e.g. Gas for route" className="rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={newExpense.notes} onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })} placeholder="Optional" className="rounded-lg" rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddExpense} disabled={addSaving}>
                {addSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Add & Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
