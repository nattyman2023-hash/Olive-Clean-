import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Loader2, CalendarDays, History, Settings, Plus, Trash2, Star, FileText, User, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import BookingSection from "@/components/client/BookingSection";
import TechnicianAvatar from "@/components/client/TechnicianAvatar";
import ClientInvoices from "@/components/client/ClientInvoices";
import ClientAccountSettings from "@/components/client/ClientAccountSettings";
import LoyaltyStatus from "@/components/client/LoyaltyStatus";
import oliveLogo from "@/assets/olive-clean-logo.png";

interface ClientRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  preferences: Record<string, string> | null;
}

interface Job {
  id: string;
  service: string;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  price: number | null;
  notes: string | null;
  assigned_to: string | null;
  duration_minutes: number | null;
}

interface FeedbackRecord {
  id: string;
  job_id: string;
  rating: number;
  comments: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  "in-progress": "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  on_route: "bg-amber-100 text-amber-800 border-amber-200",
  on_site: "bg-violet-100 text-violet-800 border-violet-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  complete: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function ClientDashboard() {
  const { user, isClient, isAdmin, loading: authLoading, rolesLoading, signOut, isImpersonating, impersonatedUserId, impersonatedRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPrefKey, setNewPrefKey] = useState("");
  const [newPrefValue, setNewPrefValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Reschedule state
  const [rescheduleJobId, setRescheduleJobId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState("09:00");

  // Inline rating state
  const [ratingJobId, setRatingJobId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/client/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !rolesLoading && user && !isClient) {
      toast("You don't have access to this dashboard.");
      navigate("/");
    }
  }, [authLoading, rolesLoading, user, isClient, navigate]);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client_record", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("client_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ClientRecord | null;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["client_jobs", client?.id],
    enabled: !!client,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("client_id", client!.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });

  const assignedUserIds = [...new Set(jobs.filter((j) => j.assigned_to).map((j) => j.assigned_to!))];
  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians_for_jobs", assignedUserIds],
    enabled: assignedUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("user_id, name, photo_url")
        .in("user_id", assignedUserIds);
      if (error) throw error;
      return data as { user_id: string; name: string; photo_url: string | null }[];
    },
  });

  const techByUserId = Object.fromEntries(technicians.map((t) => [t.user_id, t]));

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["client_feedback", client?.id],
    enabled: !!client,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("client_id", client!.id);
      if (error) throw error;
      return data as FeedbackRecord[];
    },
  });

  const prefsMutation = useMutation({
    mutationFn: async (prefs: Record<string, string>) => {
      const { error } = await supabase
        .from("clients")
        .update({ preferences: prefs as unknown as null })
        .eq("id", client!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_record"] });
      toast.success("Preferences saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("jobs").update({ status: "cancelled" }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_jobs"] });
      toast.success("Appointment cancelled");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ jobId, newDate }: { jobId: string; newDate: string }) => {
      const { error } = await supabase.from("jobs").update({ scheduled_at: newDate }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_jobs"] });
      toast.success("Appointment rescheduled");
      setRescheduleJobId(null);
      setRescheduleDate(undefined);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inlineRatingMutation = useMutation({
    mutationFn: async ({ jobId, rating }: { jobId: string; rating: number }) => {
      const { error } = await supabase.from("feedback").insert({
        job_id: jobId,
        client_id: client!.id,
        rating,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_feedback"] });
      toast.success("Thanks for your rating!");
      setRatingJobId(null);
      setRatingValue(0);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addPreference = () => {
    if (!newPrefKey.trim()) return;
    const current = (client?.preferences || {}) as Record<string, string>;
    prefsMutation.mutate({ ...current, [newPrefKey.trim()]: newPrefValue.trim() });
    setNewPrefKey("");
    setNewPrefValue("");
  };

  const removePreference = (key: string) => {
    const current = { ...((client?.preferences || {}) as Record<string, string>) };
    delete current[key];
    prefsMutation.mutate(current);
  };

  const handleRescheduleConfirm = () => {
    if (!rescheduleJobId || !rescheduleDate) return;
    const [hours, minutes] = rescheduleTime.split(":").map(Number);
    const dt = new Date(rescheduleDate);
    dt.setHours(hours, minutes, 0, 0);
    rescheduleMutation.mutate({ jobId: rescheduleJobId, newDate: dt.toISOString() });
  };

  if (authLoading || clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center max-w-sm">
          <img src={oliveLogo} alt="Olive Clean" className="h-10 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-foreground mb-2">No Client Record Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your account isn't linked to a client profile yet. Please contact Olive Clean to connect your account.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={signOut} className="rounded-full">Sign Out</Button>
            <Button asChild className="rounded-full"><Link to="/">Go Home</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const upcomingJobs = jobs.filter((j) => ["scheduled", "in-progress", "accepted", "on_route", "on_site"].includes(j.status));
  const pastJobs = jobs.filter((j) => j.status === "completed" || j.status === "complete" || j.status === "cancelled");
  const filteredPastJobs = statusFilter === "all" ? pastJobs : pastJobs.filter((j) => j.status === statusFilter);
  const feedbackByJob = Object.fromEntries(feedbacks.map((f) => [f.job_id, f]));
  const prefs = (client.preferences || {}) as Record<string, string>;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={oliveLogo} alt="Olive Clean" className="h-8" />
          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">{client.name}</h1>
            <p className="text-xs text-muted-foreground">Client Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
          <Button variant="ghost" size="icon" onClick={signOut} className="active:scale-95 transition-transform">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        <Tabs defaultValue="home" className="space-y-6">
          <TabsList className="bg-card border border-border rounded-xl p-1 h-auto">
            <TabsTrigger value="home" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CalendarDays className="h-3 w-3 mr-1" />Home
            </TabsTrigger>
            <TabsTrigger value="invoices" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-3 w-3 mr-1" />Invoices
            </TabsTrigger>
            <TabsTrigger value="account" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-3 w-3 mr-1" />Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-8">
            {/* Loyalty Status */}
            <LoyaltyStatus clientId={client.id} />

            {/* Book a Cleaning */}
            <BookingSection client={{ name: client.name, email: client.email, phone: client.phone, address: client.address }} />

            {/* Upcoming Jobs */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Upcoming Appointments</h2>
              </div>
              {upcomingJobs.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {upcomingJobs.map((job) => {
                    const tech = job.assigned_to ? techByUserId[job.assigned_to] : null;
                    const canModify = job.status === "scheduled";
                    return (
                      <Card key={job.id}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{job.service}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(job.scheduled_at), "EEEE, MMM d 'at' h:mm a")}</p>
                              {tech && (
                                <div className="mt-1.5">
                                  <TechnicianAvatar name={tech.name} photoUrl={tech.photo_url} />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {job.price && <span className="text-sm font-semibold tabular-nums">${Number(job.price).toFixed(0)}</span>}
                              <span className={`text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_BADGE[job.status] || ""}`}>
                                {job.status.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                          {canModify && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs rounded-lg flex-1"
                                onClick={() => {
                                  setRescheduleJobId(job.id);
                                  setRescheduleDate(new Date(job.scheduled_at));
                                  setRescheduleTime(format(new Date(job.scheduled_at), "HH:mm"));
                                }}
                              >
                                <CalendarIcon className="h-3 w-3 mr-1" /> Reschedule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={cancelMutation.isPending}
                                onClick={() => {
                                  if (confirm("Are you sure you want to cancel this appointment?")) {
                                    cancelMutation.mutate(job.id);
                                  }
                                }}
                              >
                                <X className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Past Jobs with filter */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Past Appointments</h2>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-7 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredPastJobs.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No past appointments yet.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {filteredPastJobs.slice(0, 20).map((job) => {
                    const fb = feedbackByJob[job.id];
                    const tech = job.assigned_to ? techByUserId[job.assigned_to] : null;
                    const isCompleted = job.status === "completed" || job.status === "complete";
                    const showInlineRating = isCompleted && !fb;
                    return (
                      <Card key={job.id}>
                        <CardContent className="py-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{job.service}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(job.scheduled_at), "MMM d, yyyy")}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {tech && <span className="text-xs text-muted-foreground">{tech.name}</span>}
                              {job.duration_minutes && <span className="text-xs text-muted-foreground">{job.duration_minutes} min</span>}
                              {job.price != null && <span className="text-xs font-medium">${Number(job.price).toFixed(0)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {fb ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-medium tabular-nums">{fb.rating}</span>
                              </div>
                            ) : showInlineRating ? (
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <button
                                    key={s}
                                    disabled={inlineRatingMutation.isPending}
                                    onClick={() => {
                                      setRatingJobId(job.id);
                                      setRatingValue(s);
                                      inlineRatingMutation.mutate({ jobId: job.id, rating: s });
                                    }}
                                    onMouseEnter={() => { setRatingJobId(job.id); setRatingHover(s); }}
                                    onMouseLeave={() => setRatingHover(0)}
                                    className="transition-transform active:scale-90"
                                  >
                                    <Star
                                      className={`h-4 w-4 transition-colors ${
                                        s <= (ratingJobId === job.id ? (ratingHover || ratingValue) : 0)
                                          ? "fill-primary text-primary"
                                          : "text-muted-foreground/30"
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            <span className={`text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_BADGE[job.status] || ""}`}>
                              {job.status}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Preferences */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">My Preferences</h2>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-normal">
                    Let us know about gate codes, pet names, cleaning preferences, or anything else we should remember.
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(prefs).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(prefs).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5 group">
                          <div>
                            <span className="text-xs font-semibold text-foreground">{key}</span>
                            <span className="text-xs text-muted-foreground ml-3">{value}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePreference(key)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Key (e.g. Gate Code)"
                      value={newPrefKey}
                      onChange={(e) => setNewPrefKey(e.target.value)}
                      className="rounded-xl text-sm flex-1"
                    />
                    <Input
                      placeholder="Value (e.g. #4821)"
                      value={newPrefValue}
                      onChange={(e) => setNewPrefValue(e.target.value)}
                      className="rounded-xl text-sm flex-1"
                    />
                    <Button size="icon" onClick={addPreference} disabled={!newPrefKey.trim() || prefsMutation.isPending} className="rounded-xl shrink-0 active:scale-[0.97] transition-transform">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="invoices">
            <ClientInvoices clientId={client.id} />
          </TabsContent>

          <TabsContent value="account">
            <ClientAccountSettings client={client as any} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["client_record"] })} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleJobId} onOpenChange={(o) => { if (!o) setRescheduleJobId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Calendar
              mode="single"
              selected={rescheduleDate}
              onSelect={setRescheduleDate}
              disabled={(date) => date < new Date()}
              className={cn("p-3 pointer-events-auto rounded-xl border border-border")}
            />
            <div>
              <label className="text-xs text-muted-foreground">Time</label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="rounded-xl mt-1"
              />
            </div>
            <Button
              onClick={handleRescheduleConfirm}
              disabled={!rescheduleDate || rescheduleMutation.isPending}
              className="w-full rounded-xl"
            >
              {rescheduleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm New Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
