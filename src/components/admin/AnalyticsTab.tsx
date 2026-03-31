import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from "recharts";
import { DollarSign, CheckCircle2, Users, TrendingUp, Download, Briefcase, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import FeedbackStats from "./FeedbackStats";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

type Job = Tables<"jobs">;
type ClientMinimal = Pick<Tables<"clients">, "id" | "created_at">;

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(var(--primary))",
  complete: "hsl(var(--primary))",
  scheduled: "hsl(210 40% 60%)",
  in_progress: "hsl(45 90% 50%)",
  cancelled: "hsl(0 60% 55%)",
};

function downloadCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<ClientMinimal[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [jobsRes, clientsRes, empRes, perfRes] = await Promise.all([
        supabase.from("jobs").select("*"),
        supabase.from("clients").select("id, created_at"),
        supabase.from("employees").select("id, user_id, name").eq("status", "active"),
        supabase.from("employee_performance").select("*").order("month", { ascending: false }),
      ]);
      setJobs(jobsRes.data ?? []);
      setClients(clientsRes.data ?? []);
      setEmployees(empRes.data ?? []);
      setPerformance(perfRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Revenue data with period comparison
  const revenueData = useMemo(() => {
    const map = new Map<string, number>();
    jobs.filter((j) => (j.status === "completed" || j.status === "complete") && j.price).forEach((j) => {
      const d = new Date(j.completed_at ?? j.scheduled_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + Number(j.price));
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, revenue]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      revenue,
      monthKey: month,
    }));
  }, [jobs]);

  const totalRevenue = useMemo(
    () => jobs.filter((j) => j.status === "completed" || j.status === "complete").reduce((s, j) => s + Number(j.price ?? 0), 0),
    [jobs]
  );

  // Current vs previous month revenue
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const prevMonthKey = format(subMonths(new Date(), 1), "yyyy-MM");
  const currentMonthRev = revenueData.find((r) => r.monthKey === currentMonthKey)?.revenue ?? 0;
  const prevMonthRev = revenueData.find((r) => r.monthKey === prevMonthKey)?.revenue ?? 0;
  const revenueChange = prevMonthRev > 0 ? Math.round(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100) : 0;

  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((j) => map.set(j.status, (map.get(j.status) ?? 0) + 1));
    return [...map.entries()].map(([status, count]) => ({ status, count }));
  }, [jobs]);

  const completionRate = useMemo(() => {
    if (!jobs.length) return 0;
    return Math.round((jobs.filter((j) => j.status === "completed" || j.status === "complete").length / jobs.length) * 100);
  }, [jobs]);

  // Client growth
  const growthData = useMemo(() => {
    const sorted = [...clients].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const map = new Map<string, number>();
    sorted.forEach((c) => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    let cumulative = 0;
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => {
      cumulative += count;
      return {
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        newClients: count,
        totalClients: cumulative,
      };
    });
  }, [clients]);

  // Employee productivity
  const productivityData = useMemo(() => {
    const empMap = new Map(employees.map((e) => [e.user_id, e.name]));
    const stats = new Map<string, { jobs: number; totalMinutes: number }>();
    jobs.filter((j) => j.status === "completed" || j.status === "complete").forEach((j) => {
      if (!j.assigned_to) return;
      const name = empMap.get(j.assigned_to) || j.assigned_to;
      const existing = stats.get(name) || { jobs: 0, totalMinutes: 0 };
      existing.jobs += 1;
      existing.totalMinutes += Number(j.duration_minutes ?? 0);
      stats.set(name, existing);
    });
    return [...stats.entries()].map(([name, s]) => ({
      name,
      jobs: s.jobs,
      avgMinutes: s.jobs > 0 ? Math.round(s.totalMinutes / s.jobs) : 0,
    })).sort((a, b) => b.jobs - a.jobs);
  }, [jobs, employees]);

  // Performance scores by employee
  const perfByEmployee = useMemo(() => {
    const map = new Map<string, any>();
    const empById = new Map(employees.map((e) => [e.id, e.name]));
    performance.forEach((p) => {
      if (!map.has(p.employee_id)) {
        map.set(p.employee_id, {
          name: empById.get(p.employee_id) || "Unknown",
          avgRating: Number(p.avg_rating),
          jobsCompleted: Number(p.jobs_completed),
          efficiency: Number(p.avg_efficiency_pct),
        });
      }
    });
    return [...map.values()].sort((a, b) => b.avgRating - a.avgRating);
  }, [performance, employees]);

  // Retention: new vs returning clients by month
  const retentionData = useMemo(() => {
    const clientFirstJob = new Map<string, string>();
    const sortedJobs = [...jobs].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    sortedJobs.forEach((j) => {
      if (!clientFirstJob.has(j.client_id)) {
        clientFirstJob.set(j.client_id, format(new Date(j.scheduled_at), "yyyy-MM"));
      }
    });

    const monthlyData = new Map<string, { newClients: number; returning: number }>();
    sortedJobs.filter((j) => j.status === "completed" || j.status === "complete").forEach((j) => {
      const month = format(new Date(j.scheduled_at), "yyyy-MM");
      const isNew = clientFirstJob.get(j.client_id) === month;
      const existing = monthlyData.get(month) || { newClients: 0, returning: 0 };
      if (isNew) existing.newClients += 1;
      else existing.returning += 1;
      monthlyData.set(month, existing);
    });

    return [...monthlyData.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, d]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      ...d,
    }));
  }, [jobs]);

  const exportRevenue = () => {
    downloadCSV(
      revenueData.map((r) => ({ Month: r.month, Revenue: r.revenue })),
      `revenue-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
  };

  const exportJobs = () => {
    downloadCSV(
      jobs.map((j) => ({
        ID: j.id,
        Service: j.service,
        Status: j.status,
        ScheduledAt: j.scheduled_at,
        CompletedAt: j.completed_at || "",
        Price: j.price ?? "",
        DurationMinutes: j.duration_minutes ?? "",
      })),
      `jobs-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
  };

  const exportClients = () => {
    downloadCSV(
      clients.map((c) => ({ ID: c.id, CreatedAt: c.created_at })),
      `clients-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2"><div className="h-4 w-24 rounded bg-muted" /></CardHeader>
            <CardContent><div className="h-8 w-16 rounded bg-muted" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} subtitle={revenueChange !== 0 ? `${revenueChange > 0 ? "+" : ""}${revenueChange}% vs last month` : undefined} />
        <StatCard icon={CheckCircle2} label="Completion Rate" value={`${completionRate}%`} />
        <StatCard icon={Users} label="Total Clients" value={clients.length.toString()} />
        <StatCard icon={TrendingUp} label="Total Jobs" value={jobs.length.toString()} />
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={exportRevenue} className="text-xs rounded-lg gap-1">
          <Download className="h-3 w-3" />Revenue CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportJobs} className="text-xs rounded-lg gap-1">
          <Download className="h-3 w-3" />Jobs CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportClients} className="text-xs rounded-lg gap-1">
          <Download className="h-3 w-3" />Clients CSV
        </Button>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <EmptyChart message="No completed jobs with revenue yet" />
            ) : (
              <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
                <BarChart data={revenueData}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Job Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <EmptyChart message="No jobs recorded yet" />
            ) : (
              <div className="flex items-center gap-6">
                <ChartContainer config={Object.fromEntries(statusData.map((s) => [s.status, { label: s.status.replace("_", " "), color: STATUS_COLORS[s.status] ?? "hsl(var(--muted))" }]))} className="h-[220px] w-[220px] shrink-0">
                  <PieChart>
                    <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {statusData.map((s) => (
                        <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "hsl(var(--muted))"} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-2">
                  {statusData.map((s) => (
                    <div key={s.status} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: STATUS_COLORS[s.status] ?? "hsl(var(--muted))" }} />
                      <span className="capitalize text-muted-foreground">{s.status.replace("_", " ")}</span>
                      <span className="ml-auto font-medium tabular-nums">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client retention */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Client Retention (New vs Returning)</CardTitle></CardHeader>
          <CardContent>
            {retentionData.length === 0 ? (
              <EmptyChart message="Not enough data" />
            ) : (
              <ChartContainer config={{ newClients: { label: "New", color: "hsl(var(--primary))" }, returning: { label: "Returning", color: "hsl(var(--accent))" } }} className="h-[260px] w-full">
                <BarChart data={retentionData}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="newClients" fill="var(--color-newClients)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="returning" fill="var(--color-returning)" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Client growth */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Client Growth</CardTitle></CardHeader>
          <CardContent>
            {growthData.length === 0 ? (
              <EmptyChart message="No clients added yet" />
            ) : (
              <ChartContainer config={{ totalClients: { label: "Clients", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-totalClients)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-totalClients)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="totalClients" stroke="var(--color-totalClients)" fill="url(#clientGrad)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Productivity */}
      {productivityData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-4 w-4" />Employee Productivity</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground py-2">Technician</th>
                    <th className="text-right text-xs font-medium text-muted-foreground py-2">Jobs</th>
                    <th className="text-right text-xs font-medium text-muted-foreground py-2">Avg Duration</th>
                    {perfByEmployee.length > 0 && (
                      <>
                        <th className="text-right text-xs font-medium text-muted-foreground py-2">Rating</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-2">Efficiency</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {productivityData.map((p) => {
                    const perf = perfByEmployee.find((pe) => pe.name === p.name);
                    return (
                      <tr key={p.name} className="border-b border-border/50">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 text-right tabular-nums">{p.jobs}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{p.avgMinutes ? `${p.avgMinutes} min` : "—"}</td>
                        {perfByEmployee.length > 0 && (
                          <>
                            <td className="py-2 text-right tabular-nums">{perf ? `${perf.avgRating.toFixed(1)} ⭐` : "—"}</td>
                            <td className="py-2 text-right tabular-nums text-muted-foreground">{perf ? `${perf.efficiency.toFixed(0)}%` : "—"}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback section */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Client Feedback</h2>
        <FeedbackStats />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle }: { icon: React.ElementType; label: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">{message}</div>
  );
}
