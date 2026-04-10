import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Download, ChevronLeft, ChevronRight, CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
interface JobDetail { id: string; tip: number; service?: string; }
interface ExpenseDetail { id: string; amount: number; description: string; category: string; }

const DEFAULT_HOURLY_RATE = 25;

export default function PayoutsSection({ readOnly }: { readOnly?: boolean }) {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<EmployeePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    sessions: TimeSession[];
    jobs: JobDetail[];
    expenses: ExpenseDetail[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const toggleDetail = async (p: EmployeePayout) => {
    if (expandedId === p.employee_id) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }
    setExpandedId(p.employee_id);
    setDetailLoading(true);

    const [timeRes, jobsRes, expRes] = await Promise.all([
      supabase.from("job_time_logs")
        .select("action_type, recorded_at")
        .eq("employee_user_id", p.user_id)
        .gte("recorded_at", weekStart.toISOString())
        .lte("recorded_at", weekEnd.toISOString())
        .order("recorded_at", { ascending: true }),
      supabase.from("jobs")
        .select("id, tip_amount, service")
        .eq("assigned_to", p.user_id)
        .eq("status", "complete")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString()),
      supabase.from("expenses")
        .select("id, amount, description, category")
        .eq("employee_id", p.employee_id)
        .eq("status", "approved")
        .gte("submitted_at", weekStart.toISOString())
        .lte("submitted_at", weekEnd.toISOString()),
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
      jobs: (jobsRes.data || []).map((j) => ({ id: j.id, tip: Number(j.tip_amount || 0), service: j.service })),
      expenses: (expRes.data || []).map((e) => ({ id: e.id, amount: Number(e.amount), description: e.description, category: e.category })),
    });
    setDetailLoading(false);
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

        <div className="ml-auto">
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
                <TableHead></TableHead>
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
              {payouts.map((p) => (
                <>
                  <TableRow key={p.employee_id} className="cursor-pointer" onClick={() => toggleDetail(p)}>
                    <TableCell className="w-8 px-2">
                      {expandedId === p.employee_id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
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
                    <TableCell className="text-right text-sm">
                      {p.pay_type === "hourly" ? (
                        <span>{p.hours_worked.toFixed(2)} hrs × ${p.hourly_rate.toFixed(2)}</span>
                      ) : (
                        <span>{p.completed_jobs_count} jobs × ${p.fixed_job_rate.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">${p.base_pay.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${p.tips.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${p.approved_expenses.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">${p.total_payout.toFixed(2)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {p.already_paid ? (
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
                  {expandedId === p.employee_id && (
                    <TableRow key={`${p.employee_id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/30 p-4">
                        {detailLoading ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                        ) : detailData ? (
                          <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">Clock Sessions</h4>
                              {detailData.sessions.length === 0 ? (
                                <p className="text-muted-foreground text-xs">No time logs this week</p>
                              ) : (
                                <div className="space-y-1">
                                  {detailData.sessions.map((s, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span>{format(new Date(s.clock_in), "EEE MMM d, h:mm a")} → {format(new Date(s.clock_out), "h:mm a")}</span>
                                      <span className="font-medium">{s.hours.toFixed(2)}h</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">Completed Jobs</h4>
                              {detailData.jobs.length === 0 ? (
                                <p className="text-muted-foreground text-xs">No completed jobs this week</p>
                              ) : (
                                <div className="space-y-1">
                                  {detailData.jobs.map((j, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span>{j.service || "Job"}</span>
                                      {j.tip > 0 && <span className="text-emerald-600">+${j.tip.toFixed(2)} tip</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">Approved Expenses</h4>
                              {detailData.expenses.length === 0 ? (
                                <p className="text-muted-foreground text-xs">No expenses this week</p>
                              ) : (
                                <div className="space-y-1">
                                  {detailData.expenses.map((e, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span>{e.description}</span>
                                      <span className="font-medium">${e.amount.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
