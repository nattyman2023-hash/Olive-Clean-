import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Loader2,
  Users,
  Plus,
} from "lucide-react";

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  cover_note: string | null;
  status: string;
  applied_at: string;
  notes: string | null;
  screening_score: number | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  applied: { label: "Applied", icon: Clock, className: "text-olive-gold bg-olive-gold/10" },
  screening: { label: "Screening", icon: Eye, className: "text-primary bg-primary/10" },
  interview: { label: "Interview", icon: Users, className: "text-accent bg-accent/10" },
  hired: { label: "Hired", icon: CheckCircle2, className: "text-secondary bg-secondary/10" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-destructive bg-destructive/10" },
};

const STATUSES = ["all", "applied", "screening", "interview", "hired", "rejected"];

export default function HiringTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [noteText, setNoteText] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["applicants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applicants")
        .select("*")
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data as Applicant[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("applicants").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(`Status updated to ${vars.status}`);
      if (selected?.id === vars.id) setSelected({ ...selected, status: vars.status });
    },
    onError: () => toast.error("Failed to update status."),
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("applicants").update({ notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Notes saved.");
      if (selected?.id === vars.id) setSelected({ ...selected!, notes: vars.notes });
    },
    onError: () => toast.error("Failed to save notes."),
  });

  const moveToTeamMutation = useMutation({
    mutationFn: async (applicant: Applicant) => {
      // Create employee record
      const { error: empErr } = await supabase.from("employees").insert({
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        user_id: crypto.randomUUID(),
        status: "onboarding",
      });
      if (empErr) throw empErr;
      // Update applicant status
      const { error: appErr } = await supabase
        .from("applicants")
        .update({ status: "hired" })
        .eq("id", applicant.id);
      if (appErr) throw appErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Applicant moved to team!");
      setSelected(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addApplicantMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; cover_note: string }) => {
      const { error } = await supabase.from("applicants").insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        cover_note: data.cover_note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      setAddOpen(false);
      toast.success("Applicant added manually");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = applicants.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applicants.length,
    applied: applicants.filter((a) => a.status === "applied").length,
    screening: applicants.filter((a) => a.status === "screening").length,
    interview: applicants.filter((a) => a.status === "interview").length,
  };

  return (
    <div>
      {/* Job Postings Management */}
      <JobPostingsSection />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Applicants", value: stats.total, color: "text-foreground" },
          { label: "New", value: stats.applied, color: "text-olive-gold" },
          { label: "Screening", value: stats.screening, color: "text-primary" },
          { label: "Interview", value: stats.interview, color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applicants..." className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <AddApplicantDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            onSubmit={(data) => addApplicantMutation.mutate(data)}
            loading={addApplicantMutation.isPending}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No applicants yet. Share your careers page to start receiving applications.</p>
            </div>
          ) : (
            filtered.map((a) => {
              const sc = statusConfig[a.status] || statusConfig.applied;
              const Icon = sc.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setNoteText(a.notes || ""); }}
                  className={`w-full text-left bg-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.99] ${
                    selected?.id === a.id ? "border-primary shadow-md" : "border-border shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.email}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${sc.className}`}>
                      <Icon className="h-3 w-3" />
                      {sc.label}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied {new Date(a.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
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
                <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applied {new Date(selected.applied_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">{selected.email}</span>
                </div>
                {selected.phone && (
                  <p className="text-muted-foreground">{selected.phone}</p>
                )}
              </div>

              {selected.cover_note && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Cover Note</p>
                  <p className="text-sm text-foreground">{selected.cover_note}</p>
                </div>
              )}

              {selected.resume_url && (
                <div className="border-t border-border pt-4">
                  <a
                    href={selected.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Resume
                  </a>
                </div>
              )}

              {/* Notes */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Internal Notes</p>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add screening notes..."
                  className="rounded-lg text-sm min-h-[80px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 rounded-lg active:scale-[0.97]"
                  disabled={updateNotesMutation.isPending}
                  onClick={() => updateNotesMutation.mutate({ id: selected.id, notes: noteText })}
                >
                  Save Notes
                </Button>
              </div>

              {/* Status actions */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {["applied", "screening", "interview", "rejected"].map((s) => {
                    const sc = statusConfig[s];
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatusMutation.mutate({ id: selected.id, status: s })}
                        disabled={selected.status === s}
                        className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-40 ${sc.className}`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Move to Team */}
              {selected.status === "interview" && (
                <div className="border-t border-border pt-4">
                  <Button
                    className="w-full rounded-lg active:scale-[0.97]"
                    disabled={moveToTeamMutation.isPending}
                    onClick={() => moveToTeamMutation.mutate(selected)}
                  >
                    {moveToTeamMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    <UserPlus className="h-4 w-4 mr-1" />
                    Move to Team
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select an applicant to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddApplicantDialog({ open, onOpenChange, onSubmit, loading }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; email: string; phone: string; cover_note: string }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverNote, setCoverNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl">
          <Plus className="h-4 w-4 mr-1" /> Add Applicant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Applicant Manually</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@email.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(615) 555-0123" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={coverNote} onChange={(e) => setCoverNote(e.target.value)} placeholder="Referral source, experience, etc." className="min-h-[80px]" />
          </div>
          <Button
            onClick={() => onSubmit({ name, email, phone, cover_note: coverNote })}
            disabled={!name || !email || loading}
            className="w-full rounded-xl"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Applicant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
