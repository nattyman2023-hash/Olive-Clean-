import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, DollarSign, CreditCard, Receipt, Download, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import ExpensesSection from "@/components/admin/finance/ExpensesSection";

// ── Types ────────────────────────────────────────────────────

interface EmployeePayout {
  employee_id: string;
  employee_name: string;
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

interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  customer_name: string | null;
  customer_email: string | null;
  tip_amount: number | null;
}

// ── Payouts Tab ──────────────────────────────────────────────

function PayoutsTab() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<EmployeePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
        .eq("status", "completed")
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
        const rate = rateMap[emp.id] || 0;
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

  const markPaid = async (p: EmployeePayout) => {
    if (!user) return;
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
      {/* Week picker */}
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
                <TableRow key={p.employee_id}>
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
                  <TableCell className="text-right">
                    {p.already_paid ? (
                      <Badge variant="default" className="bg-emerald-600 text-white text-[0.65rem]">
                        Paid {p.paid_at ? format(new Date(p.paid_at), "MMM d") : ""}
                      </Badge>
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Customer Payments Tab ────────────────────────────────────

function CustomerPaymentsTab() {
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list-stripe-payments", {
          body: null,
          method: "GET",
        });
        if (error) throw error;
        setPayments(data?.payments || []);
      } catch {
        toast.error("Failed to load payments.");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return payments.length === 0 ? (
    <div className="bg-card rounded-xl border border-border p-12 text-center">
      <p className="text-sm text-muted-foreground">No recent payments found.</p>
    </div>
  ) : (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Tip</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => {
            const failed = ["canceled", "requires_payment_method"].includes(p.status);
            return (
              <TableRow key={p.id} className={failed ? "bg-red-50 dark:bg-red-950/20" : ""}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{p.customer_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.customer_email || ""}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold">
                  ${(p.amount / 100).toFixed(2)} <span className="text-xs text-muted-foreground uppercase">{p.currency}</span>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {p.tip_amount ? `$${p.tip_amount.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-sm">{format(new Date(p.created * 1000), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{p.id}</TableCell>
                <TableCell>
                  <Badge
                    variant={failed ? "destructive" : p.status === "succeeded" ? "default" : "secondary"}
                    className={`text-[0.65rem] ${p.status === "succeeded" ? "bg-emerald-600 text-white" : ""}`}
                  >
                    {p.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────

export default function FinanceDashboard() {
  const { user, loading, rolesLoading, isAdmin, isFinance } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !rolesLoading) {
      if (!user || (!isAdmin && !isFinance)) {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, rolesLoading, isAdmin, isFinance, navigate]);

  if (loading || rolesLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user || (!isAdmin && !isFinance)) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage payouts, customer payments, and expense approvals</p>
        </div>

        <Tabs defaultValue="payouts" className="space-y-4">
          <TabsList className="bg-card border border-border rounded-lg p-1 h-auto">
            <TabsTrigger value="payouts" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />Payouts
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />Customer Payments
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />Expense Approvals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payouts"><PayoutsTab /></TabsContent>
          <TabsContent value="payments"><CustomerPaymentsTab /></TabsContent>
          <TabsContent value="expenses"><ExpensesSection /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
