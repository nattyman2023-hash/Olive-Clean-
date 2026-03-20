import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  Link as LinkIcon,
  Copy,
} from "lucide-react";

interface Job {
  id: string;
  client_id: string;
  service: string;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  actual_duration_minutes: number | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  clients?: { name: string; neighborhood: string | null } | null;
}

interface ClientOption {
  id: string;
  name: string;
}

const jobStatusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  scheduled: { label: "Scheduled", icon: Clock, className: "text-olive-gold bg-olive-gold/10" },
  in_progress: { label: "In Progress", icon: PlayCircle, className: "text-primary bg-primary/10" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-secondary bg-secondary/10" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "text-destructive bg-destructive/10" },
};

const SERVICES = ["essential", "general", "signature-deep", "makeover-deep"];

export default function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    service: "essential",
    scheduled_at: "",
    duration_minutes: "120",
    price: "",
    notes: "",
  });

  useEffect(() => {
    fetchJobs();
    fetchClients();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*, clients(name, neighborhood)")
      .order("scheduled_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load jobs.");
      return;
    }
    setJobs(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, name").order("name");
    setClients(data || []);
  };

  const createJob = async () => {
    if (!form.client_id || !form.scheduled_at) {
      toast.error("Client and date are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("jobs").insert({
      client_id: form.client_id,
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
    setShowForm(false);
    fetchJobs();
  };

  const updateJobStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === "completed") update.completed_at = new Date().toISOString();
    const { error } = await supabase.from("jobs").update(update).eq("id", id);
    if (error) {
      toast.error("Failed to update job.");
      return;
    }
    toast.success(`Job marked as ${status}.`);
    fetchJobs();
    if (selected?.id === id) setSelected({ ...selected, ...update });
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

  const filtered = jobs.filter((j) => {
    const clientName = j.clients?.name || "";
    const matchesSearch =
      !search ||
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      j.service.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client or service..." className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {["all", "scheduled", "in_progress", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
          <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg active:scale-[0.97]">
            <Plus className="h-4 w-4 mr-1" /> New Job
          </Button>
        </div>
      </div>

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
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg" />
          </div>
          <Button onClick={createJob} disabled={saving} className="rounded-lg active:scale-[0.97]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Create Job
          </Button>
        </div>
      )}

      {/* Job List */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No jobs found.</p>
            </div>
          ) : (
            filtered.map((j) => {
              const sc = jobStatusConfig[j.status] || jobStatusConfig.scheduled;
              const Icon = sc.icon;
              return (
                <button
                  key={j.id}
                  onClick={() => setSelected(j)}
                  className={`w-full text-left bg-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.99] ${
                    selected?.id === j.id ? "border-primary shadow-md" : "border-border shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm truncate">{j.clients?.name || "Unknown Client"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {j.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} · {new Date(j.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${sc.className}`}>
                      <Icon className="h-3 w-3" />
                      {sc.label}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 sticky top-24 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selected.clients?.name || "Unknown"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="font-medium text-foreground">
                    {new Date(selected.scheduled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                {selected.duration_minutes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Duration</span>
                    <span className="font-medium text-foreground">{selected.duration_minutes} min</span>
                  </div>
                )}
                {selected.actual_duration_minutes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Actual Duration</span>
                    <span className="font-medium text-foreground">{selected.actual_duration_minutes} min</span>
                  </div>
                )}
                {selected.price && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium text-foreground">${Number(selected.price).toFixed(2)}</span>
                  </div>
                )}
              </div>
              {selected.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              )}

              {/* Log actual duration */}
              {selected.status === "completed" && !selected.actual_duration_minutes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Log Actual Duration</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Minutes"
                      className="rounded-lg flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") logDuration(selected.id, (e.target as HTMLInputElement).value);
                      }}
                    />
                    <Button
                      size="sm"
                      className="rounded-lg active:scale-[0.97]"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        logDuration(selected.id, input.value);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Status actions */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {["scheduled", "in_progress", "completed", "cancelled"].map((s) => {
                    const sc = jobStatusConfig[s];
                    return (
                      <button
                        key={s}
                        onClick={() => updateJobStatus(selected.id, s)}
                        disabled={selected.status === s}
                        className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-40 ${sc.className}`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a job to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
