import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import ActivityTimeline from "./ActivityTimeline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Briefcase,
  Loader2,
  Copy,
  UserCircle,
  List,
  Map as MapIcon,
  Send,
  Filter,
  Trash2,
} from "lucide-react";
const JobsMap = lazy(() => import("./jobs/JobsMap"));
import JobPhotosGallery from "./JobPhotosGallery";
import AttendanceVerification from "./AttendanceVerification";
import JobsSectionTabs, { getSectionForJob, type JobSection } from "./jobs/JobsSectionTabs";
import JobStatusActions from "./jobs/JobStatusActions";

interface Job {
  id: string;
  client_id: string;
  assigned_to: string | null;
  service: string;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  actual_duration_minutes: number | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  source?: string | null;
  cancel_reason?: string | null;
  clients?: { name: string; neighborhood: string | null; lat: number | null; lng: number | null } | null;
  employees?: { name: string; photo_url: string | null } | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  photo_url: string | null;
  user_id: string;
  email: string | null;
}

const jobStatusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  scheduled: { label: "Scheduled", icon: Clock, className: "text-olive-gold bg-olive-gold/10" },
  in_progress: { label: "In Progress", icon: PlayCircle, className: "text-primary bg-primary/10" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-secondary bg-secondary/10" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "text-destructive bg-destructive/10" },
};

const FALLBACK_SERVICES = ["essential", "general", "signature-deep", "makeover-deep"];

export default function JobsTab({ readOnly, onNavigate }: { readOnly?: boolean; onNavigate?: (section: string, targetId?: string) => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<JobSection>("new");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [quickChip, setQuickChip] = useState<"" | "today" | "week" | "unassigned" | "overdue">("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "quote" | "lead" | "booking">("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("all");

  // Bulk selection state
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [serviceTemplates, setServiceTemplates] = useState<{ id: string; name: string; checklist_items: any; default_duration_minutes: number | null; default_price: number | null }[]>([]);

  const [form, setForm] = useState({
    client_id: "",
    assigned_to: "",
    service: "essential",
    scheduled_at: "",
    duration_minutes: "120",
    price: "",
    notes: "",
  });

  const SERVICES = serviceTemplates.length > 0
    ? serviceTemplates.map(t => t.name.toLowerCase().replace(/\s+/g, "-"))
    : FALLBACK_SERVICES;

  useEffect(() => {
    fetchClients();
    fetchEmployees();
    fetchServiceTemplates();
  }, []);

  const fetchServiceTemplates = async () => {
    const { data } = await supabase.from("service_templates" as any).select("id, name, checklist_items, default_duration_minutes, default_price").eq("is_active", true).order("name");
    if (data) setServiceTemplates(data as any);
  };

  useEffect(() => {
    if (employees.length > 0) fetchJobs();
  }, [employees]);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*, clients(name, neighborhood, lat, lng)")
      .order("scheduled_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load jobs.");
      return;
    }
    const empByUserId = new Map(employees.map((e) => [e.user_id, e]));
    const normalized = (data || []).map((j: any) => ({
      ...j,
      employees: j.assigned_to ? empByUserId.get(j.assigned_to) || null : null,
    })) as Job[];
    setJobs(normalized);

    // Deep link: if a notification stashed a job id, open that drawer
    try {
      const targetId = sessionStorage.getItem("openJobId");
      if (targetId) {
        const target = normalized.find((j) => j.id === targetId);
        if (target) {
          setSection(getSectionForJob(target));
          setSelected(target);
        }
        sessionStorage.removeItem("openJobId");
      }
    } catch { /* noop */ }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, name").order("name");
    setClients(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("id, name, photo_url, user_id, email").eq("status", "active").order("name");
    setEmployees(data || []);
  };

  const createJob = async () => {
    if (!form.client_id || !form.scheduled_at) {
      toast.error("Client and date are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("jobs").insert({
      client_id: form.client_id,
      assigned_to: form.assigned_to || null,
      service: form.service,
      scheduled_at: form.scheduled_at,
      duration_minutes: parseInt(form.duration_minutes) || null,
      price: form.price ? parseFloat(form.price) : null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to create job.");
      return;
    }
    toast.success("Job created.");

    if (form.assigned_to) {
      const emp = employees.find((e) => e.user_id === form.assigned_to);
      const client = clients.find((c) => c.id === form.client_id);
      if (emp?.email) {
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "job-assigned",
            recipientEmail: emp.email,
            idempotencyKey: `job-assigned-new-${form.client_id}-${form.scheduled_at}-${form.assigned_to}`,
            templateData: {
              employeeName: emp.name,
              clientName: client?.name,
              service: form.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              date: new Date(form.scheduled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
            },
          },
        });
      }
    }

    setShowForm(false);
    setForm({ client_id: "", assigned_to: "", service: "essential", scheduled_at: "", duration_minutes: "120", price: "", notes: "" });
    fetchJobs();
  };

  const updateJobStatus = async (id: string, status: string, reason?: string) => {
    const job = jobs.find((j) => j.id === id);
    const previousStatus = job?.status;
    const update: any = { status };
    if (status === "completed") update.completed_at = new Date().toISOString();
    if (status === "cancelled") {
      update.cancelled_at = new Date().toISOString();
      if (reason) update.cancel_reason = reason;
    }
    if (status === "in_progress" && previousStatus === "completed") {
      update.completed_at = null;
    }
    if (status === "scheduled" && previousStatus === "cancelled") {
      update.cancelled_at = null;
      update.cancel_reason = null;
    }
    const { error } = await supabase.from("jobs").update(update).eq("id", id);
    if (error) {
      toast.error("Failed to update job.");
      return;
    }
    toast.success(`Job marked as ${status}.`);

    // Audit trail
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const actor = user?.email || "admin";
      let content = `Status: ${previousStatus || "?"} → ${status} (by ${actor})`;
      if (reason) content += ` — Reason: ${reason}`;
      await supabase.from("crm_notes").insert({
        parent_type: "job",
        parent_id: id,
        author_id: user?.id || null,
        content,
        note_type: "status_change",
      });

      // Fan-out in-app notifications to admins (and assigned tech), suppress self
      const titleMap: Record<string, string> = {
        in_progress: "Job started",
        completed: "Job completed",
        cancelled: "Job cancelled",
        scheduled: "Job restored",
      };
      const recipients = new Set<string>();
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      admins?.forEach((a: any) => recipients.add(a.user_id));
      if (job?.assigned_to) recipients.add(job.assigned_to);
      if (user?.id) recipients.delete(user.id);
      if (recipients.size > 0) {
        const prettyService = job?.service?.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Job";
        const prettyDate = job?.scheduled_at ? new Date(job.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
        await supabase.from("notifications").insert(
          Array.from(recipients).map((uid) => ({
            user_id: uid,
            type: `job_${status}`,
            title: `${titleMap[status] || "Job updated"} — ${job?.clients?.name || "Client"}`,
            body: `${prettyService}${prettyDate ? ` · ${prettyDate}` : ""}${reason ? ` · Reason: ${reason}` : ""}`,
            metadata: { job_id: id, previous_status: previousStatus, new_status: status, reason: reason || null } as any,
          }))
        );
      }
    } catch (_) { /* non-blocking */ }

    // Auto-increment loyalty cleanings on completion
    if (status === "completed") {
      const job = jobs.find((j) => j.id === id);
      if (job?.client_id) {
        const { data: member } = await supabase
          .from("perks_members")
          .select("id, cleanings_completed, free_cleanings_earned, program_type, joined_at, referred_by")
          .eq("client_id", job.client_id)
          .eq("status", "active")
          .maybeSingle();

        if (member) {
          const newCount = (member.cleanings_completed || 0) + 1;
          const updateData: any = { cleanings_completed: newCount };

          const PROGRAM_KEY_MAP: Record<string, string> = {
            loyalty_club: "Loyalty Club", friends_family: "Friends & Family",
            veterans: "Veterans", retired: "Retired",
          };
          const progName = PROGRAM_KEY_MAP[member.program_type] || member.program_type;
          const { data: prog } = await supabase
            .from("loyalty_programs")
            .select("benefits")
            .eq("name", progName)
            .maybeSingle();

          const interval = (prog as any)?.benefits?.free_cleaning_interval || 10;
          if (newCount > 0 && newCount % interval === 0) {
            updateData.free_cleanings_earned = (member.free_cleanings_earned || 0) + 1;
            await supabase.from("loyalty_milestones").insert({
              member_id: member.id,
              milestone_type: "free_cleaning",
              notes: `Earned after ${newCount} cleanings`,
            });
          }

          if (member.joined_at) {
            const joinedDate = new Date(member.joined_at);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            if (joinedDate <= sixMonthsAgo) {
              const { data: existingDusting } = await supabase
                .from("loyalty_milestones")
                .select("id")
                .eq("member_id", member.id)
                .eq("milestone_type", "complimentary_dusting")
                .maybeSingle();
              if (!existingDusting) {
                await supabase.from("loyalty_milestones").insert({
                  member_id: member.id,
                  milestone_type: "complimentary_dusting",
                  notes: "Auto-awarded at 6 months membership",
                });
              }
            }
          }

          if (member.referred_by && newCount === 1) {
            const { data: existingReward } = await supabase
              .from("loyalty_milestones")
              .select("id")
              .eq("member_id", member.referred_by)
              .eq("milestone_type", "referral_reward")
              .eq("notes", `Referral: member ${member.id}`)
              .maybeSingle();
            if (!existingReward) {
              await supabase.from("loyalty_milestones").insert({
                member_id: member.referred_by,
                milestone_type: "referral_reward",
                notes: `Referral: member ${member.id}`,
              });
            }
          }

          await supabase.from("perks_members").update(updateData).eq("id", member.id);
        }
      }

      // Auto-create invoice draft
      const completedJob = jobs.find((j) => j.id === id);
      if (completedJob) {
        const invoiceNumber = `INV-${Date.now()}`;
        const items = [{
          description: completedJob.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          quantity: 1,
          rate: Number(completedJob.price || 0),
          amount: Number(completedJob.price || 0),
        }];
        const subtotal = Number(completedJob.price || 0);
        await supabase.from("invoices").insert({
          client_id: completedJob.client_id,
          job_id: id,
          invoice_number: invoiceNumber,
          status: "draft",
          items: items as any,
          subtotal,
          tax_rate: 0,
          tax_amount: 0,
          total: subtotal,
        });
      }
    }

    // Boomerang logic: if cancelled, return associated lead to pipeline
    if (status === "cancelled") {
      const job = jobs.find((j) => j.id === id);
      if (job?.client_id) {
        // Send job-update email to client
        const { data: clientData } = await supabase.from("clients").select("email, name").eq("id", job.client_id).single();
        if (clientData?.email) {
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "job-update",
              recipientEmail: clientData.email,
              idempotencyKey: `job-update-${id}-${status}`,
              templateData: {
                clientName: clientData.name,
                service: job.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                status,
                date: new Date(job.scheduled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
              },
            },
          });
        }
      }

      // Boomerang: find lead that converted to this job, set back to "new"
      const { data: boomerangLead } = await supabase
        .from("leads")
        .select("id")
        .eq("converted_job_id", id)
        .maybeSingle();
      if (boomerangLead) {
        await supabase.from("leads").update({ status: "new" } as any).eq("id", boomerangLead.id);
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("crm_notes").insert({
          parent_type: "lead",
          parent_id: boomerangLead.id,
          author_id: user?.id || null,
          content: "Job cancelled — lead returned to pipeline",
          note_type: "system",
        });
      }
    }

    fetchJobs();
    if (selected?.id === id) setSelected({ ...selected, ...update });
  };

  const reassignJob = async (jobId: string, employeeId: string | null) => {
    const { error } = await supabase.from("jobs").update({ assigned_to: employeeId }).eq("id", jobId);
    if (error) {
      toast.error("Failed to reassign job.");
      return;
    }
    toast.success(employeeId ? "Job reassigned." : "Assignment removed.");

    if (employeeId) {
      const emp = employees.find((e) => e.user_id === employeeId);
      const job = jobs.find((j) => j.id === jobId);
      if (emp?.email && job) {
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "job-assigned",
            recipientEmail: emp.email,
            idempotencyKey: `job-assigned-${jobId}-${employeeId}`,
            templateData: {
              employeeName: emp.name,
              clientName: job.clients?.name,
              service: job.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              date: new Date(job.scheduled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
            },
          },
        });
      }
    }

    fetchJobs();
  };

  const logDuration = async (id: string, minutes: string) => {
    const val = parseInt(minutes);
    if (isNaN(val)) return;
    const { error } = await supabase.from("jobs").update({ actual_duration_minutes: val }).eq("id", id);
    if (error) {
      toast.error("Failed to log duration.");
      return;
    }
    toast.success("Duration logged.");
    fetchJobs();
  };

  const neighborhoods = Array.from(new Set(jobs.map((j) => j.clients?.neighborhood).filter(Boolean) as string[])).sort();

  const activeFilterCount = [dateFrom, dateTo, employeeFilter !== "all" ? employeeFilter : "", serviceFilter !== "all" ? serviceFilter : "", neighborhoodFilter !== "all" ? neighborhoodFilter : ""].filter(Boolean).length;

  const clearFilters = () => { setDateFrom(""); setDateTo(""); setEmployeeFilter("all"); setServiceFilter("all"); setNeighborhoodFilter("all"); };

  const toggleJobSelection = (id: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === filtered.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filtered.map((j) => j.id)));
    }
  };

  const bulkDeleteJobs = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedJobs);
    const { error } = await supabase.from("jobs").delete().in("id", ids);
    setBulkDeleting(false);
    setShowDeleteConfirm(false);
    if (error) {
      toast.error("Failed to delete jobs.");
      return;
    }
    toast.success(`${ids.length} job${ids.length > 1 ? "s" : ""} deleted.`);
    setSelectedJobs(new Set());
    fetchJobs();
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selectedJobs);
    const update: any = { status };
    if (status === "completed") update.completed_at = new Date().toISOString();
    const { error } = await supabase.from("jobs").update(update).in("id", ids);
    if (error) {
      toast.error("Failed to update jobs.");
      return;
    }
    toast.success(`${ids.length} job${ids.length > 1 ? "s" : ""} marked as ${status}.`);

    if (status === "completed") {
      const completedJobs = jobs.filter((j) => ids.includes(j.id));
      for (const cj of completedJobs) {
        const invoiceNumber = `INV-${Date.now()}-${cj.id.slice(0, 4)}`;
        const items = [{
          description: cj.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          quantity: 1,
          rate: Number(cj.price || 0),
          amount: Number(cj.price || 0),
        }];
        const subtotal = Number(cj.price || 0);
        await supabase.from("invoices").insert({
          client_id: cj.client_id,
          job_id: cj.id,
          invoice_number: invoiceNumber,
          status: "draft",
          items: items as any,
          subtotal,
          tax_rate: 0,
          tax_amount: 0,
          total: subtotal,
        });
      }
    }

    setSelectedJobs(new Set());
    fetchJobs();
  };

  const STATUS_PRIORITY: Record<string, number> = { scheduled: 0, in_progress: 1, completed: 2, cancelled: 3 };

  const sectionCounts = jobs.reduce(
    (acc, j) => {
      const s = getSectionForJob(j);
      acc[s] += 1;
      return acc;
    },
    { new: 0, scheduled: 0, completed: 0, archived: 0 } as Record<JobSection, number>
  );

  // Per-source counts within the currently-active section (independent of search/date filters).
  const sourceCounts = jobs.reduce(
    (acc, j) => {
      if (getSectionForJob(j) !== section) return acc;
      const src = (j.source || "manual") as "manual" | "quote" | "lead" | "booking";
      acc[src] = (acc[src] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    },
    { all: 0, manual: 0, quote: 0, lead: 0, booking: 0 } as Record<string, number>
  );

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfWeek = new Date(startOfToday); endOfWeek.setDate(endOfWeek.getDate() + 7);

  const filtered = jobs.filter((j) => {
    const clientName = j.clients?.name || "";
    const empName = j.employees?.name || "";
    const matchesSearch =
      !search ||
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      empName.toLowerCase().includes(search.toLowerCase()) ||
      j.service.toLowerCase().includes(search.toLowerCase());
    const matchesSection = getSectionForJob(j) === section;
    const matchesDateFrom = !dateFrom || j.scheduled_at >= dateFrom;
    const matchesDateTo = !dateTo || j.scheduled_at.slice(0, 10) <= dateTo;
    const matchesEmployee = employeeFilter === "all" || j.assigned_to === employeeFilter;
    const matchesService = serviceFilter === "all" || j.service === serviceFilter;
    const matchesNeighborhood = neighborhoodFilter === "all" || j.clients?.neighborhood === neighborhoodFilter;
    const matchesSource = sourceFilter === "all" || (j.source || "manual") === sourceFilter;
    const sched = new Date(j.scheduled_at);
    let matchesChip = true;
    if (quickChip === "today") matchesChip = sched >= startOfToday && sched < endOfToday;
    else if (quickChip === "week") matchesChip = sched >= startOfToday && sched < endOfWeek;
    else if (quickChip === "unassigned") matchesChip = !j.assigned_to;
    else if (quickChip === "overdue") matchesChip = j.status === "scheduled" && sched < new Date();
    return matchesSearch && matchesSection && matchesDateFrom && matchesDateTo && matchesEmployee && matchesService && matchesNeighborhood && matchesSource && matchesChip;
  }).sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 9;
    const pb = STATUS_PRIORITY[b.status] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // Pagination — only Scheduled & Completed sections paginate
  const isPaginated = section === "scheduled" || section === "completed";
  const totalPages = isPaginated ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages);
  const pagedJobs = isPaginated ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : filtered;

  useEffect(() => {
    setPage(1);
  }, [section, search, sourceFilter, quickChip, dateFrom, dateTo, employeeFilter, serviceFilter, neighborhoodFilter]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client, employee, or service..." className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("map")} className={`p-1.5 rounded-md transition-colors ${viewMode === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><MapIcon className="h-4 w-4" /></button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors relative ${showFilters ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[0.6rem] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {!readOnly && (
            <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg active:scale-[0.97]">
              <Plus className="h-4 w-4 mr-1" /> New Job
            </Button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <JobsSectionTabs active={section} counts={sectionCounts} onChange={(s) => { setSection(s); setSelectedJobs(new Set()); }} />

      {/* Quick Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { key: "", label: "All in section" },
          { key: "today", label: "Today" },
          { key: "week", label: "This week" },
          { key: "unassigned", label: "Unassigned" },
          { key: "overdue", label: "Overdue" },
        ] as const).map((c) => (
          <button
            key={c.key}
            onClick={() => setQuickChip(c.key as any)}
            className={`px-2.5 py-1 rounded-full text-[0.7rem] font-medium border transition-colors ${
              quickChip === c.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Source Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Source</span>
        {([
          { key: "all", label: "All" },
          { key: "manual", label: "Manual" },
          { key: "quote", label: "From quote" },
          { key: "lead", label: "From lead" },
          { key: "booking", label: "From booking" },
        ] as const).map((s) => {
          const active = sourceFilter === s.key;
          const count = sourceCounts[s.key] || 0;
          return (
            <button
              key={s.key}
              onClick={() => setSourceFilter(s.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.7rem] font-medium border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {s.label}
              <span
                className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full ${
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-primary hover:underline">Clear all</button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[0.65rem] text-muted-foreground mb-1 block">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[0.65rem] text-muted-foreground mb-1 block">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg text-xs" />
            </div>
            <div>
              <label className="text-[0.65rem] text-muted-foreground mb-1 block">Employee</label>
              <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground">
                <option value="all">All Employees</option>
                {employees.map((e) => (
                  <option key={e.user_id} value={e.user_id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[0.65rem] text-muted-foreground mb-1 block">Service</label>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground">
                <option value="all">All Services</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[0.65rem] text-muted-foreground mb-1 block">Location</label>
              <select value={neighborhoodFilter} onChange={(e) => setNeighborhoodFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground">
                <option value="all">All Locations</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Schedule New Job</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground active:scale-95">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground"
            >
              <option value="">Select Client *</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground"
            >
              <option value="">Assign To (optional)</option>
              {employees.map((e) => (
                <option key={e.id} value={e.user_id}>{e.name}</option>
              ))}
            </select>
            <select
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground"
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="rounded-lg" />
            <Input placeholder="Duration (min)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="rounded-lg" />
            <Input placeholder="Price ($)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-lg" />
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg sm:col-span-2" />
          </div>
          <Button onClick={createJob} disabled={saving} className="rounded-lg active:scale-[0.97]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Create Job
          </Button>
        </div>
      )}

      {/* Map or List View */}
      {viewMode === "map" ? (
        <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}>
          <JobsMap jobs={filtered} />
        </Suspense>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          {!loading && pagedJobs.length > 0 && (
            <div className="flex items-center gap-3 px-2">
              <Checkbox
                checked={selectedJobs.size === pagedJobs.length && pagedJobs.length > 0}
                onCheckedChange={() => {
                  if (selectedJobs.size === pagedJobs.length) setSelectedJobs(new Set());
                  else setSelectedJobs(new Set(pagedJobs.map((j) => j.id)));
                }}
              />
              <span className="text-xs text-muted-foreground">
                {selectedJobs.size > 0 ? `${selectedJobs.size} selected` : `Select all on page (${pagedJobs.length})`}
              </span>
            </div>
          )}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No jobs found.</p>
            </div>
          ) : (
            pagedJobs.map((j) => {
              const sc = jobStatusConfig[j.status] || jobStatusConfig.scheduled;
              const Icon = sc.icon;
              const isChecked = selectedJobs.has(j.id);
              return (
                <div key={j.id} className="flex items-start gap-3">
                  <div className="pt-5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleJobSelection(j.id)}
                    />
                  </div>
                  <button
                    onClick={() => setSelected(j)}
                    className={`flex-1 text-left bg-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.99] ${
                      selected?.id === j.id ? "border-primary shadow-md" : isChecked ? "border-primary/50 shadow-sm" : "border-border shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">{j.clients?.name || "Unknown Client"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {j.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} · {new Date(j.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        {j.source && j.source !== "manual" && (
                          <span className="inline-block mt-1 text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800 capitalize">
                            From {j.source}
                          </span>
                        )}
                        {j.employees?.name && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Avatar className="h-4 w-4">
                              {j.employees.photo_url && <AvatarImage src={j.employees.photo_url} alt={j.employees.name} />}
                              <AvatarFallback className="text-[0.4rem] bg-primary/10 text-primary">{getInitials(j.employees.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-[0.65rem] text-muted-foreground">{j.employees.name}</span>
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${sc.className}`}>
                        <Icon className="h-3 w-3" />
                        {sc.label}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
          {/* Pager */}
          {!loading && isPaginated && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 pt-4 px-2">
              <span className="text-xs text-muted-foreground">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-8"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job Detail Sheet (right drawer) */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {selected?.clients?.name || "Job Details"}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4">
              <JobDetailPanel
                job={selected}
                employees={employees}
                onStatusChange={updateJobStatus}
                onReassign={reassignJob}
                onLogDuration={logDuration}
                getInitials={getInitials}
                onNavigate={onNavigate}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk Action Toolbar */}
      {!readOnly && selectedJobs.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{selectedJobs.size} selected</span>
          <div className="h-5 w-px bg-border" />
          <select
            onChange={(e) => { if (e.target.value) { bulkUpdateStatus(e.target.value); e.target.value = ""; } }}
            className="px-3 py-1.5 rounded-lg text-xs bg-background border border-border text-foreground"
            defaultValue=""
          >
            <option value="" disabled>Change Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button
            size="sm"
            variant="destructive"
            className="rounded-lg text-xs gap-1"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <button
            onClick={() => setSelectedJobs(new Set())}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedJobs.size} job{selectedJobs.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected jobs and any associated history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={bulkDeleteJobs}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete {selectedJobs.size} Job{selectedJobs.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Detail Panel ---------- */

interface DetailProps {
  job: Job;
  employees: EmployeeOption[];
  onStatusChange: (id: string, status: string, reason?: string) => void;
  onReassign: (jobId: string, employeeId: string | null) => void;
  onLogDuration: (id: string, minutes: string) => void;
  getInitials: (name: string) => string;
  onNavigate?: (section: string, targetId?: string) => void;
}

function JobDetailPanel({ job, employees, onStatusChange, onReassign, onLogDuration, getInitials, onNavigate }: DetailProps) {
  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={() => onNavigate?.("clients", job.client_id)}
          className="text-lg font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left"
        >
          {job.clients?.name || "Unknown"}
        </button>
        <p className="text-xs text-muted-foreground mt-0.5">
          {job.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* Assignment */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-2">Assigned To</p>
        {job.employees?.name ? (
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              {job.employees.photo_url && <AvatarImage src={job.employees.photo_url} alt={job.employees.name} />}
              <AvatarFallback className="text-[0.5rem] bg-primary/10 text-primary">{getInitials(job.employees.name)}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => onNavigate?.("team", job.assigned_to || undefined)}
              className="text-sm font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
            >
              {job.employees.name}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <UserCircle className="h-5 w-5" />
            <span className="text-sm">Unassigned</span>
          </div>
        )}
        <select
          value={job.assigned_to || ""}
          onChange={(e) => onReassign(job.id, e.target.value || null)}
          className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground"
        >
          <option value="">Unassigned</option>
          {employees.map((e) => (
            <option key={e.id} value={e.user_id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Scheduled</span>
          <span className="font-medium text-foreground">
            {new Date(job.scheduled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        {job.duration_minutes && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Est. Duration</span>
            <span className="font-medium text-foreground">{job.duration_minutes} min</span>
          </div>
        )}
        {job.actual_duration_minutes && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Actual Duration</span>
            <span className="font-medium text-foreground">{job.actual_duration_minutes} min</span>
          </div>
        )}
        {job.price && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Price</span>
            <span className="font-medium text-foreground">${Number(job.price).toFixed(2)}</span>
          </div>
        )}
      </div>
      {job.notes && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-foreground">{job.notes}</p>
        </div>
      )}

      {/* Attendance & Verification */}
      <AttendanceVerification
        jobId={job.id}
        jobLat={job.clients?.lat}
        jobLng={job.clients?.lng}
        expectedDuration={job.duration_minutes}
      />

      {/* Photos */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-2">Photos</p>
        <JobPhotosGallery jobId={job.id} />
      </div>

      {/* Log actual duration */}
      {job.status === "completed" && !job.actual_duration_minutes && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">Log Actual Duration</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Minutes"
              className="rounded-lg flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") onLogDuration(job.id, (e.target as HTMLInputElement).value);
              }}
            />
            <Button
              size="sm"
              className="rounded-lg active:scale-[0.97]"
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                onLogDuration(job.id, input.value);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Feedback link */}
      {job.status === "completed" && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">Client Feedback</p>
          <JobFeedbackDisplay jobId={job.id} />
          <div className="space-y-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg active:scale-[0.97] gap-2"
              onClick={() => {
                const url = `${window.location.origin}/feedback/${job.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Feedback link copied to clipboard!");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Feedback Link
            </Button>
            <SendFeedbackButton job={job} />
          </div>
        </div>
      )}

      {/* Activity & Notes */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-2">Activity & Notes</p>
        <ActivityTimeline parentType="job" parentId={job.id} />
      </div>

      {/* Status actions */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-2">Update Status</p>
        <JobStatusActions
          status={job.status}
          assignedTo={job.assigned_to}
          createdAt={job.created_at}
          onTransition={(next, reason) => onStatusChange(job.id, next, reason)}
        />
        {job.status === "cancelled" && job.cancel_reason && (
          <p className="text-[0.7rem] text-destructive mt-2 italic">Reason: {job.cancel_reason}</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Send Feedback Button ---------- */
function SendFeedbackButton({ job }: { job: Job }) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("email, name")
        .eq("id", job.client_id)
        .maybeSingle();
      if (!client?.email) {
        toast.error("No email found for this client.");
        return;
      }
      const feedbackUrl = `${window.location.origin}/feedback/${job.id}`;
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "feedback-request",
          recipientEmail: client.email,
          idempotencyKey: `feedback-request-${job.id}`,
          templateData: {
            clientName: client.name,
            service: job.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            feedbackUrl,
          },
        },
      });
      if (error) throw error;
      toast.success(`Feedback request sent to ${client.email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send feedback request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full rounded-lg active:scale-[0.97] gap-2"
      disabled={sending}
      onClick={handleSend}
    >
      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      Send Feedback Request
    </Button>
  );
}

/* ---------- Inline Feedback Display ---------- */
function JobFeedbackDisplay({ jobId }: { jobId: string }) {
  const [feedback, setFeedback] = useState<{ rating: number; comments: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("feedback")
      .select("rating, comments")
      .eq("job_id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        setFeedback(data as any);
        setLoaded(true);
      });
  }, [jobId]);

  if (!loaded) return null;
  if (!feedback) return <p className="text-xs text-muted-foreground italic mb-2">No feedback submitted yet.</p>;

  return (
    <div className="bg-muted/50 rounded-lg p-3 mb-2">
      <div className="flex gap-0.5 mb-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={`text-sm ${s <= feedback.rating ? "text-primary" : "text-muted-foreground/30"}`}>★</span>
        ))}
      </div>
      {feedback.comments && <p className="text-xs text-muted-foreground">{feedback.comments}</p>}
    </div>
  );
}
