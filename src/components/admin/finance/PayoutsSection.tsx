import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Download, ChevronLeft, ChevronRight, CalendarIcon, Pencil, X, Save } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface EmployeePayout {
  employee_id: string;
  employee_name: string;
  user_id: string;
  pay_type: string;
  worker_classification: string;
  hours_worked: number;
  hourly_rate: number;
  fixed_job_rate: number;
  completed_jobs_count: number;
  base_pay: number;
  tips: number;
  approved_expenses: number;
  total_payout: number;
  already_paid: boolean;
  paid_at?: string;
}

interface TimeSession { clock_in: string; clock_out: string; hours: number; }
interface JobDetail { id: string; tip: number; service?: string; client_name?: string; }
interface ExpenseDetail { id: string; amount: number; description: string; category: string; receipt_url?: string | null; }
interface AuditEntry { field_name: string; old_value: number; new_value: number; changed_at: string; notes: string | null; }

const DEFAULT_HOURLY_RATE = 25;

export default function PayoutsSection({ readOnly }: { readOnly?: boolean }) {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<EmployeePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Sheet drawer state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPayout, setSheetPayout] = useState<EmployeePayout | null>(null);
  const [detailData, setDetailData] = useState<{
    sessions: TimeSession[];
    jobs: JobDetail[];
    expenses: ExpenseDetail[];
    auditTrail: AuditEntry[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Inline editing state
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, { hours?: number; tips?: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 });

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, user_id, pay_type, fixed_job_rate, worker_classification")
        .eq("status", "active");

      if (!employees?.length) { setPayouts([]); setLoading(false); return; }

      const { data: payslips } = await supabase
        .from("payslips")
        .select("employee_id, hourly_rate")
        .order("period_end", { ascending: false });

      const rateMap: Record<string, number> = {};
      payslips?.forEach((p) => {
        if (!rateMap[p.employee_id]) rateMap[p.employee_id] = Number(p.hourly_rate);
      });

      const { data: timeLogs } = await supabase
        .from("job_time_logs")
        .select("employee_user_id, action_type, recorded_at")
        .gte("recorded_at", weekStart.toISOString())
        .lte("recorded_at", weekEnd.toISOString())
        .order("recorded_at", { ascending: true });

      const userIdToHours: Record<string, number> = {};
      const openClocks: Record<string, string> = {};
      timeLogs?.forEach((log) => {
        if (log.action_type === "clock_in") {
          openClocks[log.employee_user_id] = log.recorded_at;
        } else if (log.action_type === "clock_out" && openClocks[log.employee_user_id]) {
          const start = new Date(openClocks[log.employee_user_id]).getTime();
          const end = new Date(log.recorded_at).getTime();
          const hours = (end - start) / 3600000;
          userIdToHours[log.employee_user_id] = (userIdToHours[log.employee_user_id] || 0) + hours;
          delete openClocks[log.employee_user_id];
        }
      });

      const { data: completedJobs } = await supabase
        .from("jobs")
        .select("id, assigned_to, tip_amount")
        .eq("status", "complete")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());

      const jobCountByUser: Record<string, number> = {};
      const tipsByUser: Record<string, number> = {};
      completedJobs?.forEach((j) => {
        if (j.assigned_to) {
          jobCountByUser[j.assigned_to] = (jobCountByUser[j.assigned_to] || 0) + 1;
          tipsByUser[j.assigned_to] = (tipsByUser[j.assigned_to] || 0) + Number(j.tip_amount || 0);
        }
      });

      const { data: expenses } = await supabase
        .from("expenses")
        .select("employee_id, amount")
        .eq("status", "approved")
        .gte("submitted_at", weekStart.toISOString())
        .lte("submitted_at", weekEnd.toISOString());

      const expenseMap: Record<string, number> = {};
      expenses?.forEach((e) => {
        expenseMap[e.employee_id] = (expenseMap[e.employee_id] || 0) + Number(e.amount);
      });

      const { data: existing } = await supabase
        .from("payout_records")
        .select("employee_id, paid_at")
        .eq("week_start", format(weekStart, "yyyy-MM-dd"))
        .eq("week_end", format(weekEnd, "yyyy-MM-dd"));

      const paidMap: Record<string, string> = {};
      existing?.forEach((r) => { paidMap[r.employee_id] = r.paid_at || ""; });

      const result: EmployeePayout[] = employees.map((emp: any) => {
        const payType = emp.pay_type || "hourly";
        const classification = emp.worker_classification || "w2";
        const hours = Math.round((userIdToHours[emp.user_id] || 0) * 100) / 100;
        const rate = rateMap[emp.id] || DEFAULT_HOURLY_RATE;
        const fixedRate = Number(emp.fixed_job_rate) || 0;
        const jobsCount = jobCountByUser[emp.user_id] || 0;

        const basePay = payType === "hourly"
          ? Math.round(hours * rate * 100) / 100
          : Math.round(jobsCount * fixedRate * 100) / 100;

        const tips = Math.round((tipsByUser[emp.user_id] || 0) * 100) / 100;
        const approvedExp = expenseMap[emp.id] || 0;

        return {
          employee_id: emp.id,
          employee_name: emp.name,
          user_id: emp.user_id,
          pay_type: payType,
          worker_classification: classification,
          hours_worked: hours,
          hourly_rate: rate,
          fixed_job_rate: fixedRate,
          completed_jobs_count: jobsCount,
          base_pay: basePay,
          tips,
          approved_expenses: approvedExp,
          total_payout: Math.round((basePay + tips + approvedExp) * 100) / 100,
          already_paid: !!paidMap[emp.id],
          paid_at: paidMap[emp.id] || undefined,
        };
      });

      setPayouts(result);
    } catch {
      toast.error("Failed to load payouts.");
    }
    setLoading(false);
  }, [weekStart.toISOString(), weekEnd.toISOString()]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const openDrawer = async (p: EmployeePayout) => {
    if (editMode) return;
    setSheetPayout(p);
    setSheetOpen(true);
    setDetailLoading(true);

    const [timeRes, jobsRes, expRes, auditRes] = await Promise.all([
      supabase.from("job_time_logs")
        .select("action_type, recorded_at")
        .eq("employee_user_id", p.user_id)
        .gte("recorded_at", weekStart.toISOString())
        .lte("recorded_at", weekEnd.toISOString())
        .order("recorded_at", { ascending: true }),
      supabase.from("jobs")
        .select("id, tip_amount, service, clients(name)")
        .eq("assigned_to", p.user_id)
        .eq("status", "complete")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString()),
      supabase.from("expenses")
        .select("id, amount, description, category, receipt_url")
        .eq("employee_id", p.employee_id)
        .eq("status", "approved")
        .gte("submitted_at", weekStart.toISOString())
        .lte("submitted_at", weekEnd.toISOString()),
      supabase.from("payout_adjustments")
        .select("field_name, old_value, new_value, changed_at, notes")
        .eq("employee_id", p.employee_id)
        .eq("week_start", format(weekStart, "yyyy-MM-dd"))
        .eq("week_end", format(weekEnd, "yyyy-MM-dd"))
        .order("changed_at", { ascending: false }),
    ]);

    const sessions: TimeSession[] = [];
    let openClock: string | null = null;
    timeRes.data?.forEach((log) => {
      if (log.action_type === "clock_in") openClock = log.recorded_at;
      else if (log.action_type === "clock_out" && openClock) {
        const hrs = (new Date(log.recorded_at).getTime() - new Date(openClock).getTime()) / 3600000;
        sessions.push({ clock_in: openClock, clock_out: log.recorded_at, hours: Math.round(hrs * 100) / 100 });
        openClock = null;
      }
    });

    setDetailData({
      sessions,
      jobs: (jobsRes.data || []).map((j: any) => ({
        id: j.id,
        tip: Number(j.tip_amount || 0),
        service: j.service,
        client_name: j.clients?.name || undefined,
      })),
      expenses: (expRes.data || []).map((e: any) => ({
        id: e.id,
        amount: Number(e.amount),
        description: e.description,
        category: e.category,
        receipt_url: e.receipt_url,
      })),
      auditTrail: (auditRes.data || []) as AuditEntry[],
    });
    setDetailLoading(false);
  };

  // Inline editing
  const startEdit = (p: EmployeePayout) => {
    setEditValues((prev) => ({
      ...prev,
      [p.employee_id]: { hours: p.hours_worked, tips: p.tips },
    }));
  };

  const cancelEdit = (employeeId: string) => {
    setEditValues((prev) => {
      const next = { ...prev };
      delete next[employeeId];
      return next;
    });
  };

  const saveEdit = async (p: EmployeePayout) => {
    if (!user) return;
    const vals = editValues[p.employee_id];
    if (!vals) return;

    setSaving(p.employee_id);
    const adjustments: Array<{ employee_id: string; week_start: string; week_end: string; field_name: string; old_value: number; new_value: number; changed_by: string }> = [];
    const ws = format(weekStart, "yyyy-MM-dd");
    const we = format(weekEnd, "yyyy-MM-dd");

    if (vals.hours !== undefined && vals.hours !== p.hours_worked) {
      adjustments.push({
        employee_id: p.employee_id,
        week_start: ws,
        week_end: we,
        field_name: "hours_worked",
        old_value: p.hours_worked,
        new_value: vals.hours,
        changed_by: user.id,
      });
    }
    if (vals.tips !== undefined && vals.tips !== p.tips) {
      adjustments.push({
        employee_id: p.employee_id,
        week_start: ws,
        week_end: we,
        field_name: "tips",
        old_value: p.tips,
        new_value: vals.tips,
        changed_by: user.id,
      });
    }

    if (adjustments.length > 0) {
      const { error } = await supabase.from("payout_adjustments").insert(adjustments as any);
      if (error) {
        toast.error("Failed to save adjustment.");
        setSaving(null);
        return;
      }
      toast.success(`Adjustments saved for ${p.employee_name}.`);
    }

    cancelEdit(p.employee_id);
    setSaving(null);
    fetchPayouts();
  };

  const getEditedPayout = (p: EmployeePayout) => {
    const vals = editValues[p.employee_id];
    if (!vals) return p;
    const hours = vals.hours ?? p.hours_worked;
    const tips = vals.tips ?? p.tips;
    const basePay = p.pay_type === "hourly"
      ? Math.round(hours * p.hourly_rate * 100) / 100
      : p.base_pay;
    return {
      ...p,
      hours_worked: hours,
      tips,
      base_pay: basePay,
      total_payout: Math.round((basePay + tips + p.approved_expenses) * 100) / 100,
    };
  };

  const markPaid = async (p: EmployeePayout) => {
    if (!user || readOnly) return;
    setMarking(p.employee_id);
    const { error } = await supabase.from("payout_records").insert({
      employee_id: p.employee_id,
      week_start: format(weekStart, "yyyy-MM-dd"),
      week_end: format(weekEnd, "yyyy-MM-dd"),
      hours_worked: p.hours_worked,
      hourly_rate: p.hourly_rate,
      base_pay: p.base_pay,
      approved_expenses: p.approved_expenses,
      total_payout: p.total_payout,
      paid_by: user.id,
      tips: p.tips,
      pay_type: p.pay_type,
    } as any);
    setMarking(null);
    if (error) { toast.error("Failed to record payout."); return; }
    toast.success(`${p.employee_name} marked as paid.`);
    fetchPayouts();
  };

  const downloadCSV = () => {
    const headers = ["Employee Name", "Classification", "Pay Method", "Hours Worked", "Jobs Completed", "Pay Rate", "Base Pay", "Tips", "Expenses", "Total Owed"];
    const rows = payouts.map((p) => [
      p.employee_name,
      p.worker_classification === "w2" ? "W-2" : "1099",
      p.pay_type === "hourly" ? "Hourly" : "Per Job",
      p.hours_worked.toFixed(2),
      p.completed_jobs_count,
      p.pay_type === "hourly" ? `$${p.hourly_rate.toFixed(2)}` : `$${p.fixed_job_rate.toFixed(2)}`,
      `$${p.base_pay.toFixed(2)}`,
      `$${p.tips.toFixed(2)}`,
      `$${p.approved_expenses.toFixed(2)}`,
      `$${p.total_payout.toFixed(2)}`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${format(weekStart, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goToPreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const goToNextWeek = () => { if (!isCurrentWeek) setSelectedDate(addWeeks(selectedDate, 1)); };
  const goToCurrentWeek = () => setSelectedDate(new Date());

  const toggleEditMode = () => {
    if (editMode) {
      setEditValues({});
    } else {
      payouts.forEach((p) => {
        if (!p.already_paid) startEdit(p);
      });
    }
    setEditMode(!editMode);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 min-w-[200px] justify-center">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => { if (date) setSelectedDate(date); }}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextWeek} disabled={isCurrentWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isCurrentWeek && (
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={goToCurrentWeek}>
            Current Week
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!readOnly && payouts.length > 0 && (
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={toggleEditMode}
              className="gap-1.5 text-xs h-8"
            >
              {editMode ? <><X className="h-3.5 w-3.5" /> Exit Edit Mode</> : <><Pencil className="h-3.5 w-3.5" /> Edit Mode</>}
            </Button>
          )}
          {payouts.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1.5 text-xs h-8">
              <Download className="h-3.5 w-3.5" /> Download Payroll Report
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : payouts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No active employees found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Pay Method</TableHead>
                <TableHead className="text-right">Details</TableHead>
                <TableHead className="text-right">Base Pay</TableHead>
                <TableHead className="text-right">Tips</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((rawP) => {
                const p = getEditedPayout(rawP);
                const isEditing = !!editValues[rawP.employee_id];
                return (
                  <TableRow
                    key={p.employee_id}
                    className={cn("cursor-pointer transition-colors hover:bg-muted/50", isEditing && "bg-amber-50/50 dark:bg-amber-950/10")}
                    onClick={() => openDrawer(p)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.employee_name}</span>
                        <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0">
                          {p.worker_classification === "w2" ? "W-2" : "1099"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[0.65rem]">
                        {p.pay_type === "hourly" ? "Hourly" : "Per Job"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm" onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode && isEditing && p.pay_type === "hourly" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            value={editValues[rawP.employee_id]?.hours ?? ""}
                            onChange={(e) => setEditValues((prev) => ({
                              ...prev,
                              [rawP.employee_id]: { ...prev[rawP.employee_id], hours: Number(e.target.value) },
                            }))}
                            className="w-20 h-7 text-xs text-right"
                          />
                          <span className="text-xs text-muted-foreground">hrs × ${p.hourly_rate.toFixed(2)}</span>
                        </div>
                      ) : p.pay_type === "hourly" ? (
                        <span>{p.hours_worked.toFixed(2)} hrs × ${p.hourly_rate.toFixed(2)}</span>
                      ) : (
                        <span>{p.completed_jobs_count} jobs × ${p.fixed_job_rate.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">${p.base_pay.toFixed(2)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode && isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editValues[rawP.employee_id]?.tips ?? ""}
                          onChange={(e) => setEditValues((prev) => ({
                            ...prev,
                            [rawP.employee_id]: { ...prev[rawP.employee_id], tips: Number(e.target.value) },
                          }))}
                          className="w-20 h-7 text-xs text-right ml-auto"
                        />
                      ) : (
                        `$${p.tips.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right">${p.approved_expenses.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">${p.total_payout.toFixed(2)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {editMode && isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={() => saveEdit(rawP)} disabled={saving === rawP.employee_id}>
                            {saving === rawP.employee_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => cancelEdit(rawP.employee_id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : p.already_paid ? (
                        <Badge variant="default" className="bg-emerald-600 text-white text-[0.65rem]">
                          Paid {p.paid_at ? format(new Date(p.paid_at), "MMM d") : ""}
                        </Badge>
                      ) : readOnly ? (
                        <Badge variant="secondary" className="text-[0.65rem]">Unpaid</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => markPaid(p)}
                          disabled={marking === p.employee_id || p.total_payout === 0}
                          className="h-7 text-xs"
                        >
                          {marking === p.employee_id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark as Paid"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetPayout?.employee_name} — Weekly Detail</SheetTitle>
            <SheetDescription>
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")} ·{" "}
              {sheetPayout?.worker_classification === "w2" ? "W-2" : "1099"} ·{" "}
              {sheetPayout?.pay_type === "hourly" ? "Hourly" : "Per Job"}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : detailData && sheetPayout ? (
            <div className="space-y-6 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Base Pay</p>
                  <p className="text-lg font-bold text-foreground">${sheetPayout.base_pay.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Tips</p>
                  <p className="text-lg font-bold text-emerald-600">${sheetPayout.tips.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold text-foreground">${sheetPayout.approved_expenses.toFixed(2)}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Payout</p>
                  <p className="text-lg font-bold text-primary">${sheetPayout.total_payout.toFixed(2)}</p>
                </div>
              </div>

              {/* Clock Sessions */}
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-2">Clock Sessions</h4>
                {detailData.sessions.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No time logs this week</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailData.sessions.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs bg-muted/30 rounded-md px-3 py-2">
                        <span>{format(new Date(s.clock_in), "EEE MMM d, h:mm a")} → {format(new Date(s.clock_out), "h:mm a")}</span>
                        <span className="font-medium">{s.hours.toFixed(2)}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Jobs */}
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-2">Completed Jobs ({detailData.jobs.length})</h4>
                {detailData.jobs.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No completed jobs this week</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailData.jobs.map((j, i) => (
                      <div key={i} className="flex justify-between text-xs bg-muted/30 rounded-md px-3 py-2">
                        <div>
                          <span className="font-medium">{j.service || "Job"}</span>
                          {j.client_name && <span className="text-muted-foreground ml-1">· {j.client_name}</span>}
                        </div>
                        {j.tip > 0 && <span className="text-emerald-600 font-medium">+${j.tip.toFixed(2)} tip</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approved Expenses */}
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-2">Approved Expenses ({detailData.expenses.length})</h4>
                {detailData.expenses.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No expenses this week</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailData.expenses.map((e, i) => (
                      <div key={i} className="bg-muted/30 rounded-md px-3 py-2">
                        <div className="flex justify-between text-xs">
                          <span>{e.description}</span>
                          <span className="font-medium">${e.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[0.6rem]">{e.category}</Badge>
                          {e.receipt_url && (
                            <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[0.65rem] text-primary hover:underline">
                              View Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Trail */}
              {detailData.auditTrail.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-2">Audit Trail</h4>
                  <div className="space-y-1.5">
                    {detailData.auditTrail.map((a, i) => (
                      <div key={i} className="text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                        <span className="font-medium capitalize">{a.field_name.replace("_", " ")}</span>{" "}
                        changed from <span className="font-mono">{a.old_value}</span> to{" "}
                        <span className="font-mono font-bold">{a.new_value}</span>
                        <span className="text-muted-foreground ml-1">· {format(new Date(a.changed_at), "MMM d, h:mm a")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
