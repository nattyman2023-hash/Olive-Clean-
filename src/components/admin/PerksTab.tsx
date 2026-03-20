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

const statusBadge: Record<string, string> = {
  active: "text-primary bg-primary/10",
  paused: "text-olive-gold bg-olive-gold/10",
  cancelled: "text-destructive bg-destructive/10",
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

  // Gap Filler: cancelled jobs → nearby Perks members
  const [cancelledJobs, setCancelledJobs] = useState<any[]>([]);
  const [showGapFiller, setShowGapFiller] = useState(false);

  const loadGapFiller = async () => {
    const { data } = await supabase
      .from("jobs")
      .select("*, clients(name, neighborhood)")
      .eq("status", "cancelled")
      .order("scheduled_at", { ascending: false })
      .limit(10);
    setCancelledJobs(data || []);
    setShowGapFiller(true);
  };

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

      {/* Gap Filler View */}
      {showGapFiller && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-olive-gold" /> Gap Filler — Recently Cancelled Jobs
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
                <div key={j.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{j.clients?.name} — {j.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                    <span className="text-muted-foreground">
                      {new Date(j.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {nearbyMembers.length > 0
                      ? `${nearbyMembers.length} Perks member${nearbyMembers.length > 1 ? "s" : ""} in ${neighborhood}: ${nearbyMembers.map((m) => m.clients?.name).join(", ")}`
                      : `No active Perks members in ${neighborhood || "this area"}.`}
                  </p>
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
