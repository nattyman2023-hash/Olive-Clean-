import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, DollarSign, CreditCard, Receipt, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ── Payouts Tab ──────────────────────────────────────────────

interface EmployeePayout {
  employee_id: string;
  employee_name: string;
  hours_worked: number;
  hourly_rate: number;
  base_pay: number;
  approved_expenses: number;
  total_payout: number;
  already_paid: boolean;
  paid_at?: string;
}

function PayoutsTab() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<EmployeePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      // Get active employees
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, user_id")
        .eq("status", "active");

      if (!employees?.length) { setPayouts([]); setLoading(false); return; }

      // Get latest payslip hourly rates
      const { data: payslips } = await supabase
        .from("payslips")
        .select("employee_id, hourly_rate")
        .order("period_end", { ascending: false });

      const rateMap: Record<string, number> = {};
      payslips?.forEach((p) => {
        if (!rateMap[p.employee_id]) rateMap[p.employee_id] = Number(p.hourly_rate);
      });

      // Get verified clock-in hours for the week
      const { data: timeLogs } = await supabase
        .from("job_time_logs")
        .select("employee_user_id, action_type, recorded_at")
        .gte("recorded_at", weekStart.toISOString())
        .lte("recorded_at", weekEnd.toISOString())
        .order("recorded_at", { ascending: true });

      // Calculate hours per employee user_id
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

      // Get approved expenses for the week
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

      // Check existing payout records for the week
      const { data: existing } = await supabase
        .from("payout_records")
        .select("employee_id, paid_at")
        .eq("week_start", format(weekStart, "yyyy-MM-dd"))
        .eq("week_end", format(weekEnd, "yyyy-MM-dd"));

      const paidMap: Record<string, string> = {};
      existing?.forEach((r) => { paidMap[r.employee_id] = r.paid_at || ""; });

      const result: EmployeePayout[] = employees.map((emp) => {
        const hours = Math.round((userIdToHours[emp.user_id] || 0) * 100) / 100;
        const rate = rateMap[emp.id] || 0;
        const basePay = Math.round(hours * rate * 100) / 100;
        const approvedExp = expenseMap[emp.id] || 0;
        return {
          employee_id: emp.id,
          employee_name: emp.name,
          hours_worked: hours,
          hourly_rate: rate,
          base_pay: basePay,
          approved_expenses: approvedExp,
          total_payout: Math.round((basePay + approvedExp) * 100) / 100,
          already_paid: !!paidMap[emp.id],
          paid_at: paidMap[emp.id] || undefined,
        };
      });

      setPayouts(result);
    } catch {
      toast.error("Failed to load payouts.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchPayouts(); }, []);

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
    });
    setMarking(null);
    if (error) { toast.error("Failed to record payout."); return; }
    toast.success(`${p.employee_name} marked as paid.`);
    fetchPayouts();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">
        Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
      </p>
      {payouts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No active employees found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Base Pay</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.employee_id}>
                  <TableCell className="font-medium">{p.employee_name}</TableCell>
                  <TableCell className="text-right">{p.hours_worked.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${p.hourly_rate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${p.base_pay.toFixed(2)}</TableCell>
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

interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  customer_name: string | null;
  customer_email: string | null;
}

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

// ── Expense Approvals Tab (reuses ExpensesSection) ───────────

import ExpensesSection from "@/components/admin/finance/ExpensesSection";

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
