import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

interface PerksMember {
  id: string;
  client_id: string;
  status: string;
  discount_percent: number;
  flexibility_zone: string | null;
  joined_at: string;
  notes: string | null;
  clients?: { name: string; neighborhood: string | null; phone: string | null } | null;
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

export default function PerksTab() {
  const [members, setMembers] = useState<PerksMember[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showEnroll, setShowEnroll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<PerksMember | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    discount_percent: "40",
    flexibility_zone: "",
    notes: "",
  });

  useEffect(() => {
    fetchMembers();
    fetchClients();
  }, []);

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
    setMembers(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, name, neighborhood").order("name");
    setClients(data || []);
  };

  const enrollMember = async () => {
    if (!form.client_id) {
      toast.error("Select a client.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("perks_members").insert({
      client_id: form.client_id,
      discount_percent: parseInt(form.discount_percent) || 40,
      flexibility_zone: form.flexibility_zone || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to enroll member.");
      return;
    }
    toast.success("Member enrolled in Perks Club.");
    setShowEnroll(false);
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

  // Enhanced Gap Filler
  const [cancelledJobs, setCancelledJobs] = useState<any[]>([]);
  const [offers, setOffers] = useState<PerksOffer[]>([]);
  const [showGapFiller, setShowGapFiller] = useState(false);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);

  const loadGapFiller = async () => {
    const [jobsRes, offersRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("*, clients(name, neighborhood)")
        .eq("status", "cancelled")
        .order("scheduled_at", { ascending: false })
        .limit(10),
      supabase.from("perks_offers").select("*").order("offered_at", { ascending: false }),
    ]);
    setCancelledJobs(jobsRes.data || []);
    setOffers(offersRes.data || []);
    setShowGapFiller(true);
  };

  const sendOffer = async (cancelledJobId: string, memberId: string) => {
    setSendingOffer(`${cancelledJobId}-${memberId}`);
    const { error } = await supabase.from("perks_offers").insert({
      perks_member_id: memberId,
      cancelled_job_id: cancelledJobId,
    });
    setSendingOffer(null);
    if (error) {
      toast.error("Failed to create offer.");
      return;
    }
    toast.success("Offer sent to Perks member!");
    loadGapFiller();
  };

  const updateOfferStatus = async (offerId: string, status: "accepted" | "declined", cancelledJob?: any, member?: PerksMember) => {
    const update: any = { status, responded_at: new Date().toISOString() };

    if (status === "accepted" && cancelledJob && member) {
      // Create a new job at discounted price
      const originalPrice = cancelledJob.price ? Number(cancelledJob.price) : null;
      const discount = member.discount_percent || 40;
      const perksPrice = originalPrice ? originalPrice * (1 - discount / 100) : null;

      const { data: newJob, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          client_id: member.client_id,
          service: cancelledJob.service,
          scheduled_at: cancelledJob.scheduled_at,
          duration_minutes: cancelledJob.duration_minutes,
          price: perksPrice,
          notes: `Perks Club fill-in (${discount}% off). Original job cancelled.`,
          status: "scheduled",
        })
        .select("id")
        .single();

      if (jobErr) {
        toast.error("Failed to create replacement job.");
        return;
      }
      update.new_job_id = newJob.id;
    }

    const { error } = await supabase.from("perks_offers").update(update).eq("id", offerId);
    if (error) {
      toast.error("Failed to update offer.");
      return;
    }
    toast.success(status === "accepted" ? "Offer accepted — new job scheduled!" : "Offer declined.");
    loadGapFiller();
  };

  const getExistingOffer = (jobId: string, memberId: string) =>
    offers.find((o) => o.cancelled_job_id === jobId && o.perks_member_id === memberId);

  const filtered = members.filter((m) => {
    const name = m.clients?.name || "";
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Perks members..." className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={loadGapFiller} className="rounded-lg active:scale-[0.97]">
            <Zap className="h-4 w-4 mr-1" /> Gap Filler
          </Button>
          <Button size="sm" onClick={() => setShowEnroll(true)} className="rounded-lg active:scale-[0.97]">
            <Plus className="h-4 w-4 mr-1" /> Enroll
          </Button>
        </div>
      </div>

      {/* Enhanced Gap Filler */}
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
              const nearbyMembers = members.filter(
                (m) => m.status === "active" && m.clients?.neighborhood === neighborhood
              );
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
                  {j.price && (
                    <p className="text-xs text-muted-foreground">Original price: ${Number(j.price).toFixed(2)}</p>
                  )}
                  {nearbyMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active Perks members in {neighborhood || "this area"}.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        {nearbyMembers.length} match{nearbyMembers.length > 1 ? "es" : ""} in {neighborhood}:
                      </p>
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
                                    <button
                                      onClick={() => updateOfferStatus(existing.id, "accepted", j, m)}
                                      className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors active:scale-95"
                                      title="Accept"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => updateOfferStatus(existing.id, "declined")}
                                      className="p-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
                                      title="Decline"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg text-xs active:scale-[0.97] gap-1.5"
                                disabled={sendingOffer === `${j.id}-${m.id}`}
                                onClick={() => sendOffer(j.id, m.id)}
                              >
                                {sendingOffer === `${j.id}-${m.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
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
            <h3 className="font-semibold text-foreground">Enroll in Olive Perks Club</h3>
            <button onClick={() => setShowEnroll(false)} className="text-muted-foreground hover:text-foreground active:scale-95">
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
            <Input
              type="number"
              placeholder="Discount % (default 40)"
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
              className="rounded-lg"
            />
            <select
              value={form.flexibility_zone}
              onChange={(e) => setForm({ ...form, flexibility_zone: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground"
            >
              <option value="">Flexibility Zone</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg" />
          </div>
          <Button onClick={enrollMember} disabled={saving} className="rounded-lg active:scale-[0.97]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Enroll Member
          </Button>
        </div>
      )}

      {/* Members List */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No Perks members yet.</p>
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
                    <p className="text-xs text-muted-foreground mt-0.5">{m.flexibility_zone || "No zone"} · {m.discount_percent}% off</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusBadge[m.status] || statusBadge.active}`}>
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 sticky top-24 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selected.clients?.name || "Unknown"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Joined {new Date(selected.joined_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-foreground">{selected.discount_percent}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Zone</span>
                  <span className="font-medium text-foreground">{selected.flexibility_zone || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Neighborhood</span>
                  <span className="font-medium text-foreground">{selected.clients?.neighborhood || "—"}</span>
                </div>
              </div>
              {selected.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              )}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {["active", "paused", "cancelled"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateMemberStatus(selected.id, s)}
                      disabled={selected.status === s}
                      className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-40 ${statusBadge[s]}`}
                    >
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
