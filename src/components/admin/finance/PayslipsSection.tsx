import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Loader2, X, DollarSign, Printer, Pencil, Eye, Save } from "lucide-react";
import { format } from "date-fns";
import oliveLogo from "@/assets/olive-clean-logo.png";

interface Employee { id: string; name: string; user_id: string; }
interface Payslip {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  hours_worked: number;
  hourly_rate: number;
  calculated_amount: number;
  custom_amount: number | null;
  deductions: any[];
  additions: any[];
  net_pay: number;
  status: string;
  notes: string | null;
  created_at: string;
  employees?: { name: string } | null;
}

export default function PayslipsSection({ readOnly }: { readOnly?: boolean }) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<Payslip | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Edit state
  const [editHours, setEditHours] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editCustom, setEditCustom] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Form
  const [empId, setEmpId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [hourlyRate, setHourlyRate] = useState("25");
  const [useCustom, setUseCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [calcHours, setCalcHours] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("employees").select("id, name, user_id").eq("status", "active").order("name").then(({ data }) => setEmployees(data || []));
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("payslips").select("*, employees(name)").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Failed to load payslips."); return; }
    setPayslips((data || []) as any);
  };

  const calculateHours = async () => {
    if (!empId || !periodStart || !periodEnd) { toast.error("Select employee and dates."); return; }
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const { data } = await supabase.from("jobs").select("actual_duration_minutes, duration_minutes")
      .eq("assigned_to", emp.user_id).eq("status", "completed")
      .gte("scheduled_at", periodStart).lte("scheduled_at", periodEnd + "T23:59:59");
    const totalMin = (data || []).reduce((s, j) => s + (j.actual_duration_minutes || j.duration_minutes || 0), 0);
    setCalcHours(Math.round((totalMin / 60) * 100) / 100);
  };

  const savePayslip = async () => {
    if (!empId || !periodStart || !periodEnd) { toast.error("Fill required fields."); return; }
    const hours = calcHours || 0;
    const rate = parseFloat(hourlyRate) || 0;
    const calculated = hours * rate;
    const netPay = useCustom ? (parseFloat(customAmount) || 0) : calculated;

    setSaving(true);
    const { error } = await supabase.from("payslips").insert({
      employee_id: empId,
      period_start: periodStart,
      period_end: periodEnd,
      hours_worked: hours,
      hourly_rate: rate,
      calculated_amount: calculated,
      custom_amount: useCustom ? netPay : null,
      net_pay: netPay,
      notes: notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Failed to create payslip."); return; }
    toast.success("Payslip created.");
    setShowForm(false);
    setCalcHours(null);
    fetchPayslips();
  };

  const openPreview = (p: Payslip, inEditMode: boolean) => {
    setPreview(p);
    setEditMode(inEditMode);
    if (inEditMode) {
      setEditHours(String(p.hours_worked));
      setEditRate(String(p.hourly_rate));
      setEditCustom(p.custom_amount != null ? String(p.custom_amount) : "");
      setEditNotes(p.notes || "");
    }
  };

  const saveEdit = async () => {
    if (!preview) return;
    const hours = parseFloat(editHours) || 0;
    const rate = parseFloat(editRate) || 0;
    const calculated = hours * rate;
    const hasCustom = editCustom.trim() !== "";
    const netPay = hasCustom ? (parseFloat(editCustom) || 0) : calculated;

    setEditSaving(true);
    const { error } = await supabase.from("payslips").update({
      hours_worked: hours,
      hourly_rate: rate,
      calculated_amount: calculated,
      custom_amount: hasCustom ? parseFloat(editCustom) : null,
      net_pay: netPay,
      notes: editNotes || null,
    }).eq("id", preview.id);
    setEditSaving(false);
    if (error) { toast.error("Failed to update payslip."); return; }
    toast.success("Payslip updated.");
    setPreview(null);
    setEditMode(false);
    fetchPayslips();
  };

  const editCalcAmount = (parseFloat(editHours) || 0) * (parseFloat(editRate) || 0);
  const editNetPay = editCustom.trim() !== "" ? (parseFloat(editCustom) || 0) : editCalcAmount;

  if (preview) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
        {/* Header with logo */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <img src={oliveLogo} alt="Olive Clean" className="h-8" />
            <div>
              <h3 className="font-bold text-foreground">Payslip — {preview.employees?.name}</h3>
              <p className="text-xs text-muted-foreground">{format(new Date(preview.period_start), "MMM d")} – {format(new Date(preview.period_end), "MMM d, yyyy")}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {!editMode && (
              <Button size="icon" variant="ghost" onClick={() => openPreview(preview, true)} title="Edit"><Pencil className="h-4 w-4" /></Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setPreview(null); setEditMode(false); }}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {editMode ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hours Worked</label>
                <Input value={editHours} onChange={(e) => setEditHours(e.target.value)} className="rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hourly Rate ($)</label>
                <Input value={editRate} onChange={(e) => setEditRate(e.target.value)} className="rounded-lg" />
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>Calculated: <span className="font-bold">${editCalcAmount.toFixed(2)}</span></p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Custom Override (leave empty to use calculated)</label>
              <Input value={editCustom} onChange={(e) => setEditCustom(e.target.value)} placeholder="Optional" className="rounded-lg" />
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-sm font-bold flex justify-between">
              <span>Net Pay</span><span>${editNetPay.toFixed(2)}</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="rounded-lg" />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={editSaving} className="rounded-lg">
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)} className="rounded-lg">Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Hours Worked</span><span className="font-medium text-foreground">{Number(preview.hours_worked).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Hourly Rate</span><span className="font-medium text-foreground">${Number(preview.hourly_rate).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Calculated</span><span className="font-medium text-foreground">${Number(preview.calculated_amount).toFixed(2)}</span></div>
              {preview.custom_amount != null && (
                <div className="flex justify-between"><span className="text-muted-foreground">Custom Override</span><span className="font-medium text-foreground">${Number(preview.custom_amount).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold border-t border-border pt-2"><span>Net Pay</span><span>${Number(preview.net_pay).toFixed(2)}</span></div>
            </div>
            {preview.notes && <p className="text-xs text-muted-foreground border-t border-border pt-3">{preview.notes}</p>}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Payslips</h3>
        {!readOnly && <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg"><Plus className="h-4 w-4 mr-1" />Generate Payslip</Button>}
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Generate Payslip</h3>
            <button onClick={() => { setShowForm(false); setCalcHours(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={empId} onChange={(e) => { setEmpId(e.target.value); setCalcHours(null); }} className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
              <option value="">Select Employee *</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <Input placeholder="Hourly Rate" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="rounded-lg" />
            <Input type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setCalcHours(null); }} className="rounded-lg" />
            <Input type="date" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setCalcHours(null); }} className="rounded-lg" />
          </div>
          <Button variant="outline" size="sm" onClick={calculateHours} className="rounded-lg">Calculate Hours from Jobs</Button>
          {calcHours !== null && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>Hours: <span className="font-bold">{calcHours}</span> · Calculated: <span className="font-bold">${(calcHours * (parseFloat(hourlyRate) || 0)).toFixed(2)}</span></p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} className="rounded" />
            <span className="text-xs text-muted-foreground">Override with custom amount</span>
            {useCustom && <Input placeholder="Custom amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="rounded-lg w-40" />}
          </div>
          <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg" />
          <Button onClick={savePayslip} disabled={saving} className="rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Create Payslip
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : payslips.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><p className="text-sm text-muted-foreground">No payslips yet.</p></div>
      ) : (
        <div className="space-y-2">
          {payslips.map((p) => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
              <div>
                <p className="font-medium text-sm text-foreground">{p.employees?.name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(p.period_start), "MMM d")} – {format(new Date(p.period_end), "MMM d, yyyy")}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <p className="font-bold text-sm text-foreground">${Number(p.net_pay).toFixed(2)}</p>
                  <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full capitalize ${p.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openPreview(p, false)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                {!readOnly && <Button size="icon" variant="ghost" onClick={() => openPreview(p, true)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
