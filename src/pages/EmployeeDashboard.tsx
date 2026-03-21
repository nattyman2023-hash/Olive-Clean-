import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  LogOut, Loader2, MapPin, Clock, Star, CheckCircle2,
  ChevronDown, ChevronUp, Camera, AlertTriangle, Package,
  Navigation, Home, Play
} from "lucide-react";
import EmployeeJobMap from "@/components/employee/EmployeeJobMap";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

const STATUS_FLOW = ["scheduled", "accepted", "on_route", "on_site", "complete"] as const;
type JobStatus = typeof STATUS_FLOW[number];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-muted text-muted-foreground" },
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-800" },
  on_route: { label: "On Route", color: "bg-amber-100 text-amber-800" },
  on_site: { label: "On Site", color: "bg-violet-100 text-violet-800" },
  complete: { label: "Complete", color: "bg-emerald-100 text-emerald-800" },
};

const TIER_CHECKLISTS: Record<string, string[]> = {
  "essential-clean": ["Vacuum all floors", "Wipe kitchen counters", "Clean bathrooms", "Empty trash bins", "Dust surfaces"],
  "standard-clean": ["Vacuum all floors", "Mop hard floors", "Clean bathrooms thoroughly", "Wipe kitchen counters & appliances", "Dust all surfaces", "Empty trash bins", "Make beds"],
  "deep-clean": ["Vacuum all floors", "Mop hard floors", "Scrub bathrooms (grout, fixtures)", "Clean kitchen (appliances, inside microwave)", "Dust all surfaces & ceiling fans", "Baseboards & door frames", "Light fixtures", "Empty trash bins", "Make beds"],
  "signature-deep-clean": ["Vacuum all floors", "Mop hard floors", "Scrub bathrooms (grout, fixtures)", "Clean kitchen (appliances, inside microwave)", "Dust all surfaces & ceiling fans", "Baseboards & door frames", "Light fixtures", "Interior windows", "Cabinet interiors", "Empty trash bins", "Make beds", "Organize visible clutter"],
  "move-out-clean": ["Vacuum all floors", "Mop hard floors", "Deep clean all bathrooms", "Deep clean kitchen (inside oven, fridge)", "Wipe all walls & baseboards", "Clean inside all cabinets & closets", "Windows inside & out", "Garage sweep", "Light fixtures"],
};

const getChecklist = (service: string): string[] => {
  return TIER_CHECKLISTS[service] || TIER_CHECKLISTS["standard-clean"];
};

export default function EmployeeDashboard() {
  const { user, isStaff, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && (!user || !isStaff)) navigate("/employee/login");
  }, [authLoading, user, isStaff, navigate]);

  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ["my-employee-record", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("user_id", user!.id).maybeSingle();
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
        .select("*, clients(name, address, neighborhood, preferences)")
        .eq("assigned_to", employee!.user_id)
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
      const { data, error } = await supabase.from("employee_performance").select("*").eq("employee_id", employee!.id).order("month", { ascending: false }).limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (authLoading || empLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
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
            <h1 className="text-base font-semibold text-foreground leading-none">{employee?.name || "Team Member"}</h1>
            <p className="text-xs text-muted-foreground">On-Site Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-[0.65rem]">Staff</Badge>
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {format(today, "EEEE, MMMM d")} — {todayJobs.length} job{todayJobs.length !== 1 ? "s" : ""}
        </h2>

        {jobsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : todayJobs.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No jobs scheduled today. Enjoy your day off!</CardContent></Card>
        ) : (
          todayJobs.map((job: any, idx: number) => (
            <JobCard key={job.id} job={job} index={idx} queryClient={queryClient} employeeId={employee?.id} />
          ))
        )}

        {/* Map */}
        {!jobsLoading && todayJobs.length > 0 && (
          <EmployeeJobMap jobs={todayJobs} />
        )}

        {/* Performance */}
        {performance.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-primary" />Recent Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {performance.map((p: any) => (
                  <div key={p.id} className="grid grid-cols-5 gap-2 text-center p-2.5 rounded-lg bg-muted/50 border border-border text-xs">
                    <div><p className="text-[0.6rem] text-muted-foreground">Month</p><p className="font-medium">{format(new Date(p.month), "MMM yy")}</p></div>
                    <div><p className="text-[0.6rem] text-muted-foreground">Jobs</p><p className="font-medium">{p.jobs_completed}</p></div>
                    <div><p className="text-[0.6rem] text-muted-foreground">Rating</p><p className="font-medium">{Number(p.avg_rating).toFixed(1)}</p></div>
                    <div><p className="text-[0.6rem] text-muted-foreground">Efficiency</p><p className="font-medium">{Number(p.avg_efficiency_pct).toFixed(0)}%</p></div>
                    <div><p className="text-[0.6rem] text-muted-foreground">Attend.</p><p className="font-medium">{Number(p.attendance_score).toFixed(0)}%</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Onboarding */}
        {checklistTotal > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Onboarding — {checklistDone}/{checklistTotal}</CardTitle></CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-3">
                <div className="bg-primary h-full transition-all" style={{ width: `${checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0}%` }} />
              </div>
              <div className="space-y-1.5">
                {Object.entries(checklist).map(([key, done]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${done ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {done && <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {employee?.certifications && (employee.certifications as string[]).length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Certifications</CardTitle></CardHeader>
            <CardContent><div className="flex flex-wrap gap-2">{(employee.certifications as string[]).map((c) => <Badge key={c} variant="secondary" className="text-[0.65rem]">{c}</Badge>)}</div></CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function JobCard({ job, index, queryClient, employeeId }: { job: any; index: number; queryClient: any; employeeId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentText, setIncidentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);

  const client = job.clients as any;
  const preferences = client?.preferences as Record<string, any> | null;
  const statusInfo = STATUS_LABELS[job.status] || STATUS_LABELS.scheduled;
  const currentIdx = STATUS_FLOW.indexOf(job.status as JobStatus);
  const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  const checklistItems = getChecklist(job.service);
  const checklistState: Record<string, boolean> = (job.checklist_state as any) || {};

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const update: any = { status: newStatus };
      if (newStatus === "complete") update.completed_at = new Date().toISOString();
      const { error } = await supabase.from("jobs").update(update).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-jobs-today"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const checklistMutation = useMutation({
    mutationFn: async (newState: Record<string, boolean>) => {
      const { error } = await supabase.from("jobs").update({ checklist_state: newState as any }).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-jobs-today"] }),
  });

  const toggleCheckItem = (item: string) => {
    const newState = { ...checklistState, [item]: !checklistState[item] };
    checklistMutation.mutate(newState);
  };

  const uploadPhoto = async (file: File, bucket: string) => {
    const ext = file.name.split(".").pop();
    const path = `${job.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    toast.success(`Photo uploaded to ${bucket}`);
  };

  const incidentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").update({
        notes: [job.notes, `[INCIDENT] ${incidentText}`].filter(Boolean).join("\n"),
      }).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-jobs-today"] });
      toast.success("Incident reported");
      setIncidentText("");
      setIncidentOpen(false);
    },
  });

  const completedChecks = checklistItems.filter((item) => checklistState[item]).length;
  const allChecked = completedChecks === checklistItems.length;

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 flex items-start gap-3">
        <div className="text-xs font-semibold text-primary tabular-nums min-w-[50px] pt-0.5">
          {format(new Date(job.scheduled_at), "h:mm a")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{client?.name || "Client"}</p>
          {client?.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{client.address}</span></p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-[0.6rem]">{job.service}</Badge>
            <span className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
            {checklistItems.length > 0 && <span className="text-[0.6rem] text-muted-foreground">{completedChecks}/{checklistItems.length}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <CardContent className="border-t border-border pt-4 space-y-4">
          {/* Status progression */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Status</p>
            <div className="flex gap-1">
              {STATUS_FLOW.map((s, i) => {
                const info = STATUS_LABELS[s];
                const isActive = i <= currentIdx;
                return (
                  <div key={s} className={`flex-1 h-2 rounded-full ${isActive ? "bg-primary" : "bg-muted"}`} />
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              {STATUS_FLOW.map((s) => <span key={s} className="text-[0.55rem] text-muted-foreground">{STATUS_LABELS[s].label}</span>)}
            </div>
            {nextStatus && (
              <Button
                size="sm"
                className="w-full mt-3 rounded-xl gap-1.5"
                disabled={statusMutation.isPending || (nextStatus === "complete" && !allChecked)}
                onClick={() => statusMutation.mutate(nextStatus)}
              >
                {statusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                  nextStatus === "on_route" ? <Navigation className="h-3.5 w-3.5" /> :
                  nextStatus === "on_site" ? <Home className="h-3.5 w-3.5" /> :
                  nextStatus === "complete" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                  <Play className="h-3.5 w-3.5" />}
                Mark as {STATUS_LABELS[nextStatus].label}
              </Button>
            )}
            {nextStatus === "complete" && !allChecked && (
              <p className="text-[0.65rem] text-amber-600 mt-1 text-center">Complete all checklist items first</p>
            )}
          </div>

          {/* Home Memory */}
          {preferences && Object.keys(preferences).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1"><Home className="h-3 w-3" />Home Memory</p>
              <ul className="space-y-1">
                {Object.entries(preferences).map(([key, val]) => (
                  <li key={key} className="text-xs text-amber-900">
                    <span className="font-medium">{key.replace(/_/g, " ")}:</span> {String(val)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tier checklist */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Checklist ({completedChecks}/{checklistItems.length})</p>
            <div className="space-y-1.5">
              {checklistItems.map((item) => (
                <button key={item} onClick={() => toggleCheckItem(item)} className="flex items-center gap-2 w-full text-left">
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checklistState[item] ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                    {checklistState[item] && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-xs ${checklistState[item] ? "text-muted-foreground line-through" : "text-foreground"}`}>{item}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo uploads */}
          <div className="flex gap-2">
            <input ref={beforeInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0], "before_photos"); }} />
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0], "after_photos"); }} />
            <Button size="sm" variant="outline" className="flex-1 rounded-xl gap-1 text-xs" onClick={() => beforeInputRef.current?.click()}>
              <Camera className="h-3.5 w-3.5" />Before Photo
            </Button>
            <Button size="sm" variant="outline" className="flex-1 rounded-xl gap-1 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-3.5 w-3.5" />After Photo
            </Button>
          </div>

          {/* Incident report */}
          {incidentOpen ? (
            <div className="space-y-2">
              <Textarea value={incidentText} onChange={(e) => setIncidentText(e.target.value)} placeholder="Describe the issue (broken item, low supplies, etc.)" className="rounded-xl text-xs min-h-[60px]" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setIncidentOpen(false)}>Cancel</Button>
                <Button size="sm" className="rounded-xl text-xs gap-1" disabled={!incidentText || incidentMutation.isPending} onClick={() => incidentMutation.mutate()}>
                  {incidentMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}Submit Report
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="w-full rounded-xl gap-1.5 text-xs text-muted-foreground" onClick={() => setIncidentOpen(true)}>
              <AlertTriangle className="h-3.5 w-3.5" />Report Incident / Low Supply
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
