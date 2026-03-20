import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2, MapPin, Clock, Star, CheckCircle2 } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

export default function EmployeeDashboard() {
  const { user, isStaff, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !isStaff)) {
      navigate("/employee/login");
    }
  }, [authLoading, user, isStaff, navigate]);

  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ["my-employee-record", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const today = new Date();
  const { data: todayJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["my-jobs-today", user?.id],
    enabled: !!user && !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, clients(name, address, neighborhood)")
        .eq("assigned_to", employee!.id)
        .gte("scheduled_at", startOfDay(today).toISOString())
        .lte("scheduled_at", endOfDay(today).toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: performance = [] } = useQuery({
    queryKey: ["my-performance", employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_performance")
        .select("*")
        .eq("employee_id", employee!.id)
        .order("month", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (authLoading || empLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isStaff) return null;

  const checklist = (employee?.onboarding_checklist as Record<string, boolean>) || {};
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">O</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">
              {employee?.name || "Team Member"}
            </h1>
            <p className="text-xs text-muted-foreground">Team Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-[0.65rem]">Staff</Badge>
          <Button variant="ghost" size="icon" onClick={signOut} className="active:scale-95 transition-transform">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-3xl space-y-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Today's Schedule — {format(today, "EEEE, MMM d")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : todayJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No jobs scheduled today. Enjoy your day off!</p>
            ) : (
              <div className="space-y-3">
                {todayJobs.map((job: any) => (
                  <div key={job.id} className="flex items-start gap-4 p-3 rounded-xl bg-muted/50 border border-border">
                    <div className="text-xs font-medium text-primary tabular-nums min-w-[52px]">
                      {format(new Date(job.scheduled_at), "h:mm a")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(job.clients as any)?.name || "Client"}
                      </p>
                      {(job.clients as any)?.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{(job.clients as any).address}</span>
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[0.6rem] shrink-0">{job.service}</Badge>
                    <span className={`text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      job.status === "completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                      job.status === "in_progress" ? "bg-blue-100 text-blue-800 border-blue-200" :
                      "bg-amber-100 text-amber-800 border-amber-200"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance */}
        {performance.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Recent Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performance.map((p: any) => (
                  <div key={p.id} className="grid grid-cols-5 gap-2 text-center p-3 rounded-xl bg-muted/50 border border-border">
                    <div>
                      <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Month</p>
                      <p className="text-xs font-medium tabular-nums">{format(new Date(p.month), "MMM yy")}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Jobs</p>
                      <p className="text-xs font-medium tabular-nums">{p.jobs_completed}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Rating</p>
                      <p className="text-xs font-medium tabular-nums">{Number(p.avg_rating).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Efficiency</p>
                      <p className="text-xs font-medium tabular-nums">{Number(p.avg_efficiency_pct).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Attendance</p>
                      <p className="text-xs font-medium tabular-nums">{Number(p.attendance_score).toFixed(0)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Onboarding Progress */}
        {checklistTotal > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Onboarding Progress — {checklistDone}/{checklistTotal}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-4">
                <div className="bg-primary h-full transition-all" style={{ width: `${checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0}%` }} />
              </div>
              <div className="space-y-2">
                {Object.entries(checklist).map(([key, done]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${done ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {done && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>
                      {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {employee?.certifications && (employee.certifications as string[]).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(employee.certifications as string[]).map((cert) => (
                  <Badge key={cert} variant="secondary">{cert}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
