import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Search,
  Plus,
  X,
  Star,
  Loader2,
  Zap,
  Send,
  CheckCircle2,
  XCircle,
  Gift,
  Copy,
  Award,
  Users,
  Briefcase,
} from "lucide-react";

interface PerksMember {
  id: string;
  client_id: string;
  status: string;
  discount_percent: number;
  flexibility_zone: string | null;
  joined_at: string;
  notes: string | null;
  program_type: string;
  cleanings_completed: number;
  free_cleanings_earned: number;
  free_cleanings_used: number;
  referral_code: string | null;
  referred_by: string | null;
  clients?: { name: string; neighborhood: string | null; phone: string | null } | null;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  discount_percent: number;
  description: string | null;
  benefits: any;
  is_active: boolean;
}

interface Milestone {
  id: string;
  member_id: string;
  milestone_type: string;
  triggered_at: string;
  redeemed: boolean;
  job_id: string | null;
  notes: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  neighborhood: string | null;
}

interface PerksOffer {
  id: string;
  perks_member_id: string;
  cancelled_job_id: string;
  status: string;
  offered_at: string;
  responded_at: string | null;
  new_job_id: string | null;
}

const statusBadge: Record<string, string> = {
  active: "text-primary bg-primary/10",
  paused: "text-olive-gold bg-olive-gold/10",
  cancelled: "text-destructive bg-destructive/10",
};

const offerStatusBadge: Record<string, string> = {
  offered: "text-olive-gold bg-olive-gold/10",
  accepted: "text-primary bg-primary/10",
  declined: "text-destructive bg-destructive/10",
};

const ZONES = ["Belle Meade / West End", "Brentwood / Franklin", "Green Hills / 12 South", "West Nashville / Bellevue"];

const PROGRAM_KEY_MAP: Record<string, string> = {
  loyalty_club: "Loyalty Club",
  friends_family: "Friends & Family",
  veterans: "Veterans",
  retired: "Retired",
};

function generateReferralCode(): string {
  return "OLV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function PerksTab() {
  const [members, setMembers] = useState<PerksMember[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [showEnroll, setShowEnroll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<PerksMember | null>(null);
  const queryClient = useQueryClient();

  // Pending redemptions (redeemed = true, no job created yet)
  const [pendingRedemptions, setPendingRedemptions] = useState<(Milestone & { clientName: string; clientId: string; memberId: string })[]>([]);
  const [creatingJobFor, setCreatingJobFor] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    program_type: "loyalty_club",
    discount_percent: "",
    flexibility_zone: "",
    notes: "",
  });

  useEffect(() => {
    fetchMembers();
    fetchClients();
    fetchPrograms();
    fetchPendingRedemptions();
  }, []);

  // Realtime on loyalty_milestones
  useEffect(() => {
    const channel = supabase
      .channel("perks-milestones-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_milestones" }, () => {
        fetchPendingRedemptions();
        if (selected) fetchMilestones(selected.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected?.id]);

  useEffect(() => {
    if (selected) fetchMilestones(selected.id);
  }, [selected?.id]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("perks_members")
      .select("*, clients(name, neighborhood, phone)")
      .order("joined_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load Perks members.");
      return;
    }
    setMembers((data as any[]) || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, name, neighborhood").order("name");
    setClients(data || []);
  };

  const fetchPrograms = async () => {
    const { data } = await supabase.from("loyalty_programs").select("*").order("name");
    setPrograms((data as any[]) || []);
  };

  const fetchMilestones = async (memberId: string) => {
    const { data } = await supabase
      .from("loyalty_milestones")
      .select("*")
      .eq("member_id", memberId)
      .order("triggered_at", { ascending: false });
    setMilestones((data as any[]) || []);
  };

  const fetchPendingRedemptions = async () => {
    const { data } = await supabase
      .from("loyalty_milestones")
      .select("*, perks_members!inner(client_id, clients!inner(name))")
      .eq("redeemed", true)
      .is("job_id", null)
      .order("triggered_at", { ascending: false });
    const mapped = ((data as any[]) || []).map((ms: any) => ({
      ...ms,
      clientName: ms.perks_members?.clients?.name || "Unknown",
      clientId: ms.perks_members?.client_id || "",
      memberId: ms.member_id,
    }));
    setPendingRedemptions(mapped);
  };

  const createJobForRedemption = async (redemption: typeof pendingRedemptions[0]) => {
    setCreatingJobFor(redemption.id);
    const service = redemption.milestone_type === "complimentary_dusting" ? "complimentary-dusting" : "free-cleaning";
    const { data: newJob, error } = await supabase.from("jobs").insert({
      client_id: redemption.clientId,
      service,
      scheduled_at: new Date().toISOString(),
      notes: `Reward redemption: ${redemption.milestone_type.replace(/_/g, " ")}`,
      status: "scheduled",
      price: 0,
    }).select("id").single();
    if (error || !newJob) {
      toast.error("Failed to create job.");
      setCreatingJobFor(null);
      return;
    }
    await supabase.from("loyalty_milestones").update({ job_id: newJob.id } as any).eq("id", redemption.id);
    toast.success("Job created and linked to redemption!");
    setCreatingJobFor(null);
    fetchPendingRedemptions();
  };

  const enrollMember = async () => {
    if (!form.client_id) {
      toast.error("Select a client.");
      return;
    }
    setSaving(true);
    const program = programs.find((p) => p.name === PROGRAM_KEY_MAP[form.program_type]);
    const discount = form.discount_percent ? parseInt(form.discount_percent) : (program?.discount_percent || 40);

    const { error } = await supabase.from("perks_members").insert({
      client_id: form.client_id,
      discount_percent: discount,
      flexibility_zone: form.flexibility_zone || null,
      notes: form.notes || null,
      program_type: form.program_type,
      referral_code: generateReferralCode(),
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to enroll member.");
      return;
    }
    toast.success("Member enrolled!");
    setShowEnroll(false);
    setForm({ client_id: "", program_type: "loyalty_club", discount_percent: "", flexibility_zone: "", notes: "" });
    fetchMembers();
  };

  const updateMemberStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("perks_members").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update status.");
      return;
    }
    toast.success(`Member ${status}.`);
    fetchMembers();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const awardMilestone = async (memberId: string, type: string) => {
    const { error } = await supabase.from("loyalty_milestones").insert({
      member_id: memberId,
      milestone_type: type,
      notes: "Manually awarded by admin",
    });
    if (error) {
      toast.error("Failed to award milestone.");
      return;
    }
    if (type === "free_cleaning") {
      await supabase
        .from("perks_members")
        .update({ free_cleanings_earned: (selected?.free_cleanings_earned || 0) + 1 })
        .eq("id", memberId);
      if (selected) setSelected({ ...selected, free_cleanings_earned: (selected.free_cleanings_earned || 0) + 1 });
    }
    toast.success(`${type.replace(/_/g, " ")} awarded!`);
    fetchMilestones(memberId);
    fetchMembers();
  };

  // Gap Filler
  const [cancelledJobs, setCancelledJobs] = useState<any[]>([]);
  const [offers, setOffers] = useState<PerksOffer[]>([]);
  const [showGapFiller, setShowGapFiller] = useState(false);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);

  const loadGapFiller = async () => {
    const [jobsRes, offersRes] = await Promise.all([
      supabase.from("jobs").select("*, clients(name, neighborhood)").eq("status", "cancelled").order("scheduled_at", { ascending: false }).limit(10),
      supabase.from("perks_offers").select("*").order("offered_at", { ascending: false }),
    ]);
    setCancelledJobs(jobsRes.data || []);
    setOffers(offersRes.data || []);
    setShowGapFiller(true);
  };

  const sendOffer = async (cancelledJobId: string, memberId: string) => {
    setSendingOffer(`${cancelledJobId}-${memberId}`);
    const { error } = await supabase.from("perks_offers").insert({ perks_member_id: memberId, cancelled_job_id: cancelledJobId });
    setSendingOffer(null);
    if (error) { toast.error("Failed to create offer."); return; }
    toast.success("Offer sent!");
    loadGapFiller();
  };

  const updateOfferStatus = async (offerId: string, status: "accepted" | "declined", cancelledJob?: any, member?: PerksMember) => {
    const update: any = { status, responded_at: new Date().toISOString() };
    if (status === "accepted" && cancelledJob && member) {
      const originalPrice = cancelledJob.price ? Number(cancelledJob.price) : null;
      const discount = member.discount_percent || 40;
      const perksPrice = originalPrice ? originalPrice * (1 - discount / 100) : null;
      const { data: newJob, error: jobErr } = await supabase.from("jobs").insert({
        client_id: member.client_id, service: cancelledJob.service, scheduled_at: cancelledJob.scheduled_at,
        duration_minutes: cancelledJob.duration_minutes, price: perksPrice,
        notes: `Perks Club fill-in (${discount}% off). Original job cancelled.`, status: "scheduled",
      }).select("id").single();
      if (jobErr) { toast.error("Failed to create replacement job."); return; }
      update.new_job_id = newJob.id;
    }
    const { error } = await supabase.from("perks_offers").update(update).eq("id", offerId);
    if (error) { toast.error("Failed to update offer."); return; }
    toast.success(status === "accepted" ? "Offer accepted — new job scheduled!" : "Offer declined.");
    loadGapFiller();
  };

  const getExistingOffer = (jobId: string, memberId: string) =>
    offers.find((o) => o.cancelled_job_id === jobId && o.perks_member_id === memberId);

  const filtered = members.filter((m) => {
    const name = m.clients?.name || "";
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchesProgram = programFilter === "all" || m.program_type === programFilter;
    return matchesSearch && matchesProgram;
  });

  const getProgramForMember = (m: PerksMember) => {
    const programName = PROGRAM_KEY_MAP[m.program_type] || m.program_type;
    return programs.find((p) => p.name === programName);
  };

  const getFreeCleaningInterval = (m: PerksMember) => {
    const prog = getProgramForMember(m);
    return prog?.benefits?.free_cleaning_interval || 10;
  };

  const referralCount = (memberId: string) =>
    members.filter((m) => m.referred_by === memberId).length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Perks members..." className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {["all", "loyalty_club", "friends_family", "veterans", "retired"].map((p) => (
            <button
              key={p}
              onClick={() => setProgramFilter(p)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                programFilter === p ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "all" ? "All" : PROGRAM_KEY_MAP[p] || p}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={loadGapFiller} className="rounded-lg active:scale-[0.97]">
            <Zap className="h-4 w-4 mr-1" /> Gap Filler
          </Button>
          <Button size="sm" onClick={() => setShowEnroll(true)} className="rounded-lg active:scale-[0.97]">
            <Plus className="h-4 w-4 mr-1" /> Enroll
          </Button>
        </div>
      </div>

      {/* Pending Redemptions */}
      {pendingRedemptions.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm p-6 mb-6 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-600" /> Pending Redemptions ({pendingRedemptions.length})
          </h3>
          <p className="text-xs text-muted-foreground">Clients have redeemed rewards — create a job to fulfill each one.</p>
          <div className="space-y-2">
            {pendingRedemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-card rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.milestone_type.replace(/_/g, " ")} · Redeemed {new Date(r.triggered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="rounded-lg text-xs active:scale-[0.97] gap-1.5"
                  disabled={creatingJobFor === r.id}
                  onClick={() => createJobForRedemption(r)}
                >
                  {creatingJobFor === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Briefcase className="h-3 w-3" />}
                  Create Job
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gap Filler */}
      {showGapFiller && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-olive-gold" /> Gap Filler — Fill Cancelled Slots
            </h3>
            <button onClick={() => setShowGapFiller(false)} className="text-muted-foreground hover:text-foreground active:scale-95">
              <X className="h-4 w-4" />
            </button>
          </div>
          {cancelledJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cancelled jobs to fill.</p>
          ) : (
            cancelledJobs.map((j) => {
              const neighborhood = j.clients?.neighborhood || "";
              const nearbyMembers = members.filter((m) => m.status === "active" && m.clients?.neighborhood === neighborhood);
              return (
                <div key={j.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {j.clients?.name} — {j.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(j.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  {j.price && <p className="text-xs text-muted-foreground">Original price: ${Number(j.price).toFixed(2)}</p>}
                  {nearbyMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active Perks members in {neighborhood || "this area"}.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">{nearbyMembers.length} match{nearbyMembers.length > 1 ? "es" : ""} in {neighborhood}:</p>
                      {nearbyMembers.map((m) => {
                        const existing = getExistingOffer(j.id, m.id);
                        return (
                          <div key={m.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{m.clients?.name}</p>
                              <p className="text-[0.65rem] text-muted-foreground">{m.discount_percent}% discount · {m.clients?.phone || "No phone"}</p>
                            </div>
                            {existing ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${offerStatusBadge[existing.status]}`}>
                                  {existing.status.charAt(0).toUpperCase() + existing.status.slice(1)}
                                </span>
                                {existing.status === "offered" && (
                                  <div className="flex gap-1">
                                    <button onClick={() => updateOfferStatus(existing.id, "accepted", j, m)} className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors active:scale-95" title="Accept"><CheckCircle2 className="h-4 w-4" /></button>
                                    <button onClick={() => updateOfferStatus(existing.id, "declined")} className="p-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors active:scale-95" title="Decline"><XCircle className="h-4 w-4" /></button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="rounded-lg text-xs active:scale-[0.97] gap-1.5" disabled={sendingOffer === `${j.id}-${m.id}`} onClick={() => sendOffer(j.id, m.id)}>
                                {sendingOffer === `${j.id}-${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Send Offer
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Enroll Form */}
      {showEnroll && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Enroll New Member</h3>
            <button onClick={() => setShowEnroll(false)} className="text-muted-foreground hover:text-foreground active:scale-95"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
              <option value="">Select Client *</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.program_type} onChange={(e) => {
              const prog = programs.find((p) => p.name === PROGRAM_KEY_MAP[e.target.value]);
              setForm({ ...form, program_type: e.target.value, discount_percent: prog ? String(prog.discount_percent) : form.discount_percent });
            }} className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
              {Object.entries(PROGRAM_KEY_MAP).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <Input type="number" placeholder="Discount % (auto from program)" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} className="rounded-lg" />
            <select value={form.flexibility_zone} onChange={(e) => setForm({ ...form, flexibility_zone: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
              <option value="">Flexibility Zone</option>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg sm:col-span-2" />
          </div>
          <Button onClick={enrollMember} disabled={saving} className="rounded-lg active:scale-[0.97]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Enroll Member
          </Button>
        </div>
      )}

      {/* Members List + Detail */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No Perks members found.</p>
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={`w-full text-left bg-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.99] ${
                  selected?.id === m.id ? "border-primary shadow-md" : "border-border shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm truncate">{m.clients?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {PROGRAM_KEY_MAP[m.program_type] || m.program_type} · {m.discount_percent}% off · {m.cleanings_completed} cleanings
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusBadge[m.status] || statusBadge.active}`}>
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 sticky top-24 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selected.clients?.name || "Unknown"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {PROGRAM_KEY_MAP[selected.program_type] || selected.program_type} · Joined {new Date(selected.joined_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>

              {/* Cleaning Progress */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Free Cleaning Progress</span>
                  <span className="font-medium text-foreground tabular-nums">{selected.cleanings_completed} / {getFreeCleaningInterval(selected)}</span>
                </div>
                <Progress value={(selected.cleanings_completed / getFreeCleaningInterval(selected)) * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Earned: {selected.free_cleanings_earned}</span>
                  <span>Used: {selected.free_cleanings_used}</span>
                  <span className="font-medium text-primary">Available: {selected.free_cleanings_earned - selected.free_cleanings_used}</span>
                </div>
              </div>

              {/* Referral */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Referrals</span>
                  <span className="font-medium text-foreground">{referralCount(selected.id)}</span>
                </div>
                {selected.referral_code && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <code className="text-xs font-mono text-foreground flex-1">{selected.referral_code}</code>
                    <button onClick={() => { navigator.clipboard.writeText(selected.referral_code!); toast.success("Copied!"); }} className="text-muted-foreground hover:text-foreground active:scale-95">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-foreground">{selected.discount_percent}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Zone</span>
                  <span className="font-medium text-foreground">{selected.flexibility_zone || "—"}</span>
                </div>
              </div>

              {/* Milestones */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Milestones</p>
                </div>
                {milestones.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {milestones.map((ms) => (
                      <div key={ms.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-foreground">{ms.milestone_type.replace(/_/g, " ")}</p>
                          <p className="text-[0.6rem] text-muted-foreground">{new Date(ms.triggered_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[0.6rem] font-medium px-2 py-0.5 rounded-full ${ms.redeemed ? "text-primary bg-primary/10" : "text-olive-gold bg-olive-gold/10"}`}>
                          {ms.redeemed ? "Redeemed" : "Available"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No milestones yet.</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="rounded-lg text-xs active:scale-[0.97]" onClick={() => awardMilestone(selected.id, "free_cleaning")}>
                    <Gift className="h-3 w-3 mr-1" /> Award Free Cleaning
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-xs active:scale-[0.97]" onClick={() => awardMilestone(selected.id, "complimentary_dusting")}>
                    <Star className="h-3 w-3 mr-1" /> Award Dusting
                  </Button>
                </div>
              </div>

              {selected.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              )}

              {/* Status Controls */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {["active", "paused", "cancelled"].map((s) => (
                    <button key={s} onClick={() => updateMemberStatus(selected.id, s)} disabled={selected.status === s}
                      className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-40 ${statusBadge[s]}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
              <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a member to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
