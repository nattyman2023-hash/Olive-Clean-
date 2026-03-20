import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer } from "recharts";
import { DollarSign, CheckCircle2, Users, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Job = Tables<"jobs">;
type ClientMinimal = Pick<Tables<"clients">, "id" | "created_at">;

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(var(--primary))",
  scheduled: "hsl(210 40% 60%)",
  in_progress: "hsl(45 90% 50%)",
  cancelled: "hsl(0 60% 55%)",
};

export default function AnalyticsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [jobsRes, clientsRes] = await Promise.all([
        supabase.from("jobs").select("*"),
        supabase.from("clients").select("id, created_at"),
      ]);
      setJobs(jobsRes.data ?? []);
      setClients(clientsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Revenue by month
  const revenueData = useMemo(() => {
    const map = new Map<string, number>();
    jobs
      .filter((j) => j.status === "completed" && j.price)
      .forEach((j) => {
        const d = new Date(j.completed_at ?? j.scheduled_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, (map.get(key) ?? 0) + Number(j.price));
      });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue,
      }));
  }, [jobs]);

  const totalRevenue = useMemo(
    () => jobs.filter((j) => j.status === "completed").reduce((s, j) => s + Number(j.price ?? 0), 0),
    [jobs]
  );

  // Job status distribution
  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((j) => map.set(j.status, (map.get(j.status) ?? 0) + 1));
    return [...map.entries()].map(([status, count]) => ({ status, count }));
  }, [jobs]);

  const completionRate = useMemo(() => {
    if (!jobs.length) return 0;
    return Math.round((jobs.filter((j) => j.status === "completed").length / jobs.length) * 100);
  }, [jobs]);

  // Client growth (cumulative)
  const growthData = useMemo(() => {
    const sorted = [...clients].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
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
        clients: cumulative,
      };
    });
  }, [clients]);

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
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <StatCard icon={CheckCircle2} label="Completion Rate" value={`${completionRate}%`} />
        <StatCard icon={Users} label="Total Clients" value={clients.length.toString()} />
        <StatCard icon={TrendingUp} label="Total Jobs" value={jobs.length.toString()} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue */}
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

        {/* Status distribution */}
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

        {/* Client growth */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-medium">Client Growth</CardTitle></CardHeader>
          <CardContent>
            {growthData.length === 0 ? (
              <EmptyChart message="No clients added yet" />
            ) : (
              <ChartContainer config={{ clients: { label: "Clients", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-clients)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-clients)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="clients" stroke="var(--color-clients)" fill="url(#clientGrad)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">{message}</div>
  );
}
