import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  LogOut, Loader2, MapPin, Clock, Star, CheckCircle2,
  ChevronDown, ChevronUp, Camera, AlertTriangle, Package,
  Navigation, Home, Play, Receipt, Plus, Upload, MessageSquare,
  ChevronLeft, ChevronRight, CalendarDays, ArrowRightLeft
} from "lucide-react";
import EmployeeJobMap from "@/components/employee/EmployeeJobMap";
import TimeOffManager from "@/components/admin/TimeOffManager";
import NotificationBell from "@/components/NotificationBell";
import ShiftTradeCard from "@/components/employee/ShiftTradeCard";
import oliveLogo from "@/assets/olive-clean-logo.png";
import { format, startOfDay, endOfDay, addDays, subDays, isSameDay } from "date-fns";
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
  const { user, isStaff, isAdmin, loading: authLoading, rolesLoading, signOut, isImpersonating, impersonatedUserId, impersonatedRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!authLoading && !rolesLoading && !user) navigate("/employee/login");
  }, [authLoading, rolesLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !rolesLoading && user && !isStaff && !isImpersonating) navigate("/employee/login");
  }, [authLoading, rolesLoading, user, isStaff, isImpersonating, navigate]);

  // Use impersonated user ID for data queries
  const effectiveUserId = isImpersonating && impersonatedRole === 'staff' ? impersonatedUserId : user?.id;

  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ["my-employee-record", effectiveUserId],
    enabled: !!effectiveUserId && !rolesLoading && (isStaff || isImpersonating),
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("user_id", effectiveUserId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: dayJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["my-jobs-day", user?.id, format(selectedDate, "yyyy-MM-dd")],
    enabled: !!user && !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, clients(name, address, neighborhood, preferences, lat, lng)")
        .eq("assigned_to", employee!.user_id)
        .gte("scheduled_at", startOfDay(selectedDate).toISOString())
        .lte("scheduled_at", endOfDay(selectedDate).toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Week-at-a-glance: job counts for 7 days
  const weekStart = subDays(selectedDate, 3);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: weekJobCounts = {} } = useQuery({
    queryKey: ["my-jobs-week", user?.id, format(weekStart, "yyyy-MM-dd")],
    enabled: !!user && !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("scheduled_at")
        .eq("assigned_to", employee!.user_id)
        .gte("scheduled_at", startOfDay(weekDays[0]).toISOString())
        .lte("scheduled_at", endOfDay(weekDays[6]).toISOString());
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((j: any) => {
        const key = format(new Date(j.scheduled_at), "yyyy-MM-dd");
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
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

  // Shift trade requests
  const { data: shiftTrades = [] } = useQuery({
    queryKey: ["shift_trades", employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_trade_requests" as any)
        .select("*")
        .or(`requester_id.eq.${employee!.id},target_id.eq.${employee!.id},and(target_id.is.null,status.eq.open)`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Active employees for trade targeting
  const { data: activeEmployees = [] } = useQuery({
    queryKey: ["active_employees_for_trade"],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, user_id")
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: teamMessages = [] } = useQuery({
    queryKey: ["team_messages_employee"],
    enabled: !!user && isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_messages" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  if (authLoading || empLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user || (!isStaff && !isImpersonating)) return null;

  const checklist = (employee?.onboarding_checklist as Record<string, boolean>) || {};
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={oliveLogo} alt="Olive Clean" className="h-8" />
          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">{employee?.name || "Team Member"}</h1>
            <p className="text-xs text-muted-foreground">On-Site Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[0.65rem]">Staff</Badge>
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-4">
        {/* Week-at-a-glance strip */}
        <div className="flex items-center gap-1 justify-between">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1 flex-1 justify-center">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const count = (weekJobCounts as Record<string, number>)[key] || 0;
              const isSelected = isSameDay(day, selectedDate);
              const isDayToday = isSameDay(day, new Date());
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center px-2 py-1.5 rounded-lg transition-colors min-w-[40px] ${
                    isSelected ? "bg-primary text-primary-foreground" : isDayToday ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span className="text-[0.55rem] font-medium uppercase">{format(day, "EEE")}</span>
                  <span className="text-sm font-semibold tabular-nums">{format(day, "d")}</span>
                  {count > 0 && (
                    <span className={`text-[0.5rem] font-bold ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {count} job{count !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isToday && (
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setSelectedDate(new Date())}>
            <CalendarDays className="h-3 w-3 mr-1" /> Back to Today
          </Button>
        )}

        <h2 className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {format(selectedDate, "EEEE, MMMM d")} — {dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}
        </h2>

        {jobsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : dayJobs.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
            {isToday ? "No jobs scheduled today. Enjoy your day off!" : "No jobs scheduled for this day."}
          </CardContent></Card>
        ) : (
          dayJobs.map((job: any, idx: number) => (
            <JobCard key={job.id} job={job} index={idx} queryClient={queryClient} employeeId={employee?.id} />
          ))
        )}

        {/* Shift Trades */}
        {shiftTrades.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-600" /> Shift Trades
            </h3>
            {shiftTrades.filter((t: any) => !["approved", "denied", "cancelled"].includes(t.status)).map((trade: any) => (
              <ShiftTradeCard
                key={trade.id}
                trade={trade}
                currentEmployeeId={employee?.id || ""}
                employees={activeEmployees as any}
              />
            ))}
          </div>
        )}

        {!jobsLoading && dayJobs.length > 0 && (
          <EmployeeJobMap jobs={dayJobs} />
        )}

        {/* Team Messages */}
        {teamMessages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />Team Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamMessages.map((msg: any) => (
                <div key={msg.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-foreground">{msg.message}</p>
                  <p className="text-[0.6rem] text-muted-foreground mt-1">{format(new Date(msg.created_at), "MMM d, h:mm a")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Supply Request */}
        {employee && <SupplyRequestForm employeeId={employee.id} />}

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

        {/* Expenses */}
        {employee && <EmployeeExpenses employeeId={employee.id} />}

        {/* Time Off */}
        {employee && <TimeOffManager employeeId={employee.id} />}
      </main>
    </div>
  );
}

function SupplyRequestForm({ employeeId }: { employeeId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: supplyItems = [] } = useQuery({
    queryKey: ["supply_items_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supply_items").select("id, name, unit").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["my_supply_requests", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supply_requests" as any)
        .select("*, supply_items(name)")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const submit = async () => {
    if (!itemId || !quantity) { toast.error("Select an item and quantity."); return; }
    setSaving(true);
    const { error } = await supabase.from("supply_requests" as any).insert({
      employee_id: employeeId,
      supply_item_id: itemId,
      quantity: parseInt(quantity),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error("Failed to submit request."); return; }

    // Notify admins
    const selectedItem = supplyItems.find((s: any) => s.id === itemId);
    const { data: empRecord } = await supabase.from("employees").select("name").eq("id", employeeId).maybeSingle();
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin" as any);
    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map((r: any) => ({
        user_id: r.user_id,
        type: "supply_request",
        title: `Supply Request from ${empRecord?.name || "Staff"}`,
        body: `${quantity}× ${selectedItem?.name || "item"}`,
      }));
      await supabase.from("notifications" as any).insert(notifications);
    }

    toast.success("Supply request submitted.");
    setShowForm(false);
    setItemId("");
    setQuantity("1");
    setNotes("");
    queryClient.invalidateQueries({ queryKey: ["my_supply_requests"] });
  };

  const statusStyle: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    fulfilled: "bg-blue-100 text-blue-800",
    denied: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Supply Requests</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="h-7 text-xs rounded-lg"><Plus className="h-3 w-3 mr-1" />Request</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger className="rounded-lg text-sm"><SelectValue placeholder="Select supply item" /></SelectTrigger>
              <SelectContent>
                {supplyItems.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg text-sm" />
            <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-lg text-sm" />
            <Button size="sm" onClick={submit} disabled={saving} className="w-full rounded-lg">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}Submit Request
            </Button>
          </div>
        )}
        {myRequests.length === 0 && !showForm ? (
          <p className="text-xs text-muted-foreground text-center py-4">No supply requests yet.</p>
        ) : (
          myRequests.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="font-medium text-foreground">{(r.supply_items as any)?.name || "Item"} × {r.quantity}</p>
                {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
              </div>
              <span className={`text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full capitalize ${statusStyle[r.status] || statusStyle.pending}`}>{r.status}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function JobCard({ job, index, queryClient, employeeId }: { job: any; index: number; queryClient: any; employeeId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentText, setIncidentText] = useState("");
  const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
  const [tradeTargetId, setTradeTargetId] = useState("");
  const [tradeSaving, setTradeSaving] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
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
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["my-jobs-day"] });
      queryClient.invalidateQueries({ queryKey: ["my-jobs-week"] });
      toast.success("Status updated");

      if (newStatus === "complete" && client?.name) {
        supabase.from("clients").select("email, name").eq("id", job.client_id).maybeSingle().then(({ data: cl }) => {
          if (cl?.email) {
            const siteUrl = window.location.origin;
            supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "job-completed",
                recipientEmail: cl.email,
                idempotencyKey: `job-complete-${job.id}`,
                templateData: {
                  name: cl.name,
                  service: job.service,
                  date: format(new Date(job.scheduled_at), "MMMM d, yyyy"),
                  feedbackUrl: `${siteUrl}/feedback/${job.id}`,
                },
              },
            });
          }
        });
      }
    },
    onError: () => toast.error("Failed to update status"),
  });

  const checklistMutation = useMutation({
    mutationFn: async (newState: Record<string, boolean>) => {
      const { error } = await supabase.from("jobs").update({ checklist_state: newState as any }).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-jobs-day"] }),
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

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("job_attachments" as any).insert({
        job_id: job.id,
        uploader_id: user.id,
        uploader_role: "staff",
        file_path: path,
        bucket,
        category: bucket === "before_photos" ? "before" : "after",
      });
    }

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
      queryClient.invalidateQueries({ queryKey: ["my-jobs-day"] });
      toast.success("Incident reported");
      setIncidentText("");
      setIncidentOpen(false);
    },
  });

  const completedChecks = checklistItems.filter((item) => checklistState[item]).length;
  const allChecked = completedChecks === checklistItems.length;

  // Color coding based on time of day
  const jobHour = new Date(job.scheduled_at).getHours();
  const timeColor = jobHour < 12 ? "border-l-emerald-500" : jobHour < 17 ? "border-l-blue-500" : "border-l-violet-500";

  // Colleagues for trade
  const { data: colleagues = [] } = useQuery({
    queryKey: ["colleagues_for_trade", employeeId],
    enabled: tradeSheetOpen && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, name").eq("status", "active").neq("id", employeeId!);
      if (error) throw error;
      return data || [];
    },
  });

  const submitTrade = async () => {
    if (!employeeId) return;
    setTradeSaving(true);
    const { error } = await supabase.from("shift_trade_requests" as any).insert({
      requester_id: employeeId,
      requester_job_id: job.id,
      target_id: tradeTargetId || null,
      status: "open",
    });
    setTradeSaving(false);
    if (error) { toast.error("Failed to create trade request"); return; }

    // Create notification
    if (tradeTargetId) {
      const targetEmp = colleagues.find((c: any) => c.id === tradeTargetId);
      if (targetEmp) {
        const { data: emp } = await supabase.from("employees").select("user_id").eq("id", tradeTargetId).maybeSingle();
        if (emp) {
          await supabase.from("notifications" as any).insert({
            user_id: emp.user_id,
            type: "trade_request",
            title: "Shift trade request",
            body: `Someone wants to trade their ${format(new Date(job.scheduled_at), "MMM d")} shift with you.`,
          });
        }
      }
    }

    toast.success("Trade request posted!");
    setTradeSheetOpen(false);
    setTradeTargetId("");
    queryClient.invalidateQueries({ queryKey: ["shift_trades"] });
  };

  return (
    <Card className={`overflow-hidden border-l-4 ${timeColor}`}>
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

          {/* Trade Request Button */}
          {job.status === "scheduled" && (
            <Button size="sm" variant="outline" className="w-full rounded-xl gap-1.5 text-xs" onClick={() => setTradeSheetOpen(true)}>
              <ArrowRightLeft className="h-3.5 w-3.5" />Request Shift Trade
            </Button>
          )}
        </CardContent>
      )}

      {/* Trade Sheet */}
      <Sheet open={tradeSheetOpen} onOpenChange={setTradeSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-base">Request Shift Trade</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm font-medium">{client?.name || "Client"}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(job.scheduled_at), "EEEE, MMM d 'at' h:mm a")}</p>
              <Badge variant="outline" className="text-[0.6rem] mt-1">{job.service}</Badge>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Invite a specific colleague (optional)</label>
              <Select value={tradeTargetId} onValueChange={setTradeTargetId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Open to anyone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Open to anyone</SelectItem>
                  {colleagues.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full rounded-xl" onClick={submitTrade} disabled={tradeSaving}>
              {tradeSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Post Trade Request
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function EmployeeExpenses({ employeeId }: { employeeId: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("supplies");
  const [description, setDescription] = useState("");
  const receiptRef = useRef<HTMLInputElement>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from("expenses").select("*").eq("employee_id", employeeId).order("submitted_at", { ascending: false });
    setLoading(false);
    setExpenses(data || []);
  };

  useEffect(() => { fetchExpenses(); }, [employeeId]);

  const submit = async () => {
    if (!amount || !description) { toast.error("Amount and description required."); return; }
    setSaving(true);

    let receiptUrl: string | null = null;
    const file = receiptRef.current?.files?.[0];
    if (file) {
      const path = `${employeeId}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("expenses").insert({
      employee_id: employeeId,
      amount: parseFloat(amount),
      category,
      description,
      receipt_url: receiptUrl,
    });
    setSaving(false);
    if (error) { toast.error("Failed to submit expense."); return; }
    toast.success("Expense submitted.");
    setShowForm(false);
    setAmount(""); setDescription("");
    fetchExpenses();
  };

  const statusStyle: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />Expenses</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="h-7 text-xs rounded-lg"><Plus className="h-3 w-3 mr-1" />Add</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg text-sm" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                <option value="fuel">Fuel</option>
                <option value="supplies">Supplies</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg text-sm" />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => receiptRef.current?.click()} className="text-xs rounded-lg h-7"><Upload className="h-3 w-3 mr-1" />Receipt</Button>
              <input ref={receiptRef} type="file" accept="image/*,.pdf" className="hidden" />
            </div>
            <Button size="sm" onClick={submit} disabled={saving} className="w-full rounded-lg">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Submit Expense
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : expenses.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No expenses submitted yet.</p>
        ) : (
          expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="font-medium text-foreground">{e.description}</p>
                <p className="text-muted-foreground">{e.category} · {format(new Date(e.submitted_at), "MMM d")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">${Number(e.amount).toFixed(2)}</span>
                <span className={`text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full capitalize ${statusStyle[e.status] || statusStyle.pending}`}>{e.status}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
