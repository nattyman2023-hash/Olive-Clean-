import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, X, Pencil, ToggleLeft, ToggleRight, Loader2,
  Gift, Tag, Percent, DollarSign, Sparkles, Package,
  Check, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────
interface PerkCatalogItem {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  perk_type: "discount" | "free_service" | "gift" | "custom";
  value_type: "percent" | "flat" | "unit";
  value: number | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  is_assignable: boolean;
  max_uses: number | null;
  times_assigned: number;
  notes: string | null;
}

interface MemberPerk {
  id: string;
  perks_member_id: string;
  perk_catalog_id: string;
  assigned_at: string;
  status: string;
  redeemed_at: string | null;
  expires_at: string | null;
  notes: string | null;
  perk_catalog?: PerkCatalogItem;
}

interface Props {
  /** When provided, shows the "Assign to Member" flow for this member */
  memberId?: string;
  memberName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const PERK_TYPE_OPTIONS = [
  { value: "discount",     label: "Discount",      icon: Percent },
  { value: "free_service", label: "Free Service",  icon: Gift },
  { value: "gift",         label: "Gift",          icon: Package },
  { value: "custom",       label: "Custom",        icon: Sparkles },
] as const;

const VALUE_TYPE_OPTIONS = [
  { value: "percent", label: "% Off",        icon: Percent },
  { value: "flat",    label: "$ Amount",     icon: DollarSign },
  { value: "unit",    label: "# of Uses",    icon: Tag },
] as const;

const ICON_OPTIONS = ["🎁","⭐","💎","🌟","🎉","✨","🏷️","💰","🧹","🛍️","🎊","🌿"];

const COLOR_OPTIONS = [
  { label: "Green",  value: "emerald",  cls: "bg-emerald-500" },
  { label: "Gold",   value: "amber",    cls: "bg-amber-500" },
  { label: "Blue",   value: "blue",     cls: "bg-blue-500" },
  { label: "Purple", value: "violet",   cls: "bg-violet-500" },
  { label: "Rose",   value: "rose",     cls: "bg-rose-500" },
  { label: "Slate",  value: "slate",    cls: "bg-slate-500" },
];

const colorCls = (color: string | null) => {
  const found = COLOR_OPTIONS.find((c) => c.value === color);
  return found ? found.cls : "bg-primary";
};

const valueLabel = (item: PerkCatalogItem) => {
  if (!item.value) return "—";
  if (item.value_type === "percent") return `${item.value}% off`;
  if (item.value_type === "flat") return `$${item.value} off`;
  return `${item.value}× ${item.perk_type === "free_service" ? "free service" : "use"}`;
};

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-800",
  redeemed: "bg-blue-100 text-blue-800",
  expired:  "bg-muted text-muted-foreground",
  revoked:  "bg-red-100 text-red-800",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  perk_type: "discount" as PerkCatalogItem["perk_type"],
  value_type: "percent" as PerkCatalogItem["value_type"],
  value: "",
  icon: "🎁",
  color: "emerald",
  is_assignable: true,
  max_uses: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────
export default function PerkCatalogManager({ memberId, memberName }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState<PerkCatalogItem | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [assignNotes, setAssignNotes] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: catalog = [], isLoading } = useQuery<PerkCatalogItem[]>({
    queryKey: ["perk_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perk_catalog" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: memberPerks = [] } = useQuery<MemberPerk[]>({
    queryKey: ["member_perks", memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_perks" as any)
        .select("*, perk_catalog(*)")
        .eq("perks_member_id", memberId!)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        perk_type: form.perk_type,
        value_type: form.value_type,
        value: form.value ? parseFloat(form.value) : null,
        icon: form.icon || null,
        color: form.color || null,
        is_assignable: form.is_assignable,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("perk_catalog" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("perk_catalog" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Perk updated!" : "Perk created!");
      qc.invalidateQueries({ queryKey: ["perk_catalog"] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to save perk"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("perk_catalog" as any)
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perk status updated");
      qc.invalidateQueries({ queryKey: ["perk_catalog"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("perk_catalog" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perk deleted");
      qc.invalidateQueries({ queryKey: ["perk_catalog"] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (perkId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("member_perks" as any).insert({
        perks_member_id: memberId,
        perk_catalog_id: perkId,
        assigned_by: user?.id || null,
        notes: assignNotes.trim() || null,
      });
      if (error) throw error;
      // increment times_assigned counter
      await supabase.rpc("" as any); // no rpc needed, just increment manually
      const item = catalog.find(c => c.id === perkId);
      if (item) {
        await supabase.from("perk_catalog" as any).update({ times_assigned: (item.times_assigned || 0) + 1 }).eq("id", perkId);
      }
    },
    onSuccess: () => {
      toast.success(`Perk assigned to ${memberName || "member"}!`);
      qc.invalidateQueries({ queryKey: ["member_perks", memberId] });
      qc.invalidateQueries({ queryKey: ["perk_catalog"] });
      setAssignNotes("");
      setExpandedId(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to assign perk"),
  });

  const updateMemberPerkStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "redeemed") update.redeemed_at = new Date().toISOString();
      const { error } = await supabase.from("member_perks" as any).update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member_perks", memberId] });
      toast.success("Perk status updated");
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (item: PerkCatalogItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || "",
      perk_type: item.perk_type,
      value_type: item.value_type,
      value: item.value != null ? String(item.value) : "",
      icon: item.icon || "🎁",
      color: item.color || "emerald",
      is_assignable: item.is_assignable,
      max_uses: item.max_uses != null ? String(item.max_uses) : "",
      notes: item.notes || "",
    });
    setShowForm(true);
  };

  const isAssigned = (perkId: string) =>
    memberPerks.some((mp) => mp.perk_catalog_id === perkId && mp.status === "active");

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Perk Catalog
            {memberId && (
              <span className="text-xs font-normal text-muted-foreground">
                — assigning to <span className="font-medium text-foreground">{memberName}</span>
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create reusable perks and assign them to members when ready.
          </p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Perk
        </Button>
      </div>

      {/* ── Create / Edit Form ── */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{editing ? "Edit Perk" : "Create New Perk"}</h4>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {/* Name */}
            <Input
              placeholder="Perk name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl sm:col-span-2"
            />

            {/* Description */}
            <Textarea
              placeholder="Description (shown to member)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-xl sm:col-span-2 min-h-[60px] text-sm"
            />

            {/* Perk Type */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Perk Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PERK_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setForm({ ...form, perk_type: value })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-colors ${
                      form.perk_type === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Value Type + Value */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground block">Value</label>
              <div className="flex gap-1.5">
                <select
                  value={form.value_type}
                  onChange={(e) => setForm({ ...form, value_type: e.target.value as any })}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-background border border-border text-foreground"
                >
                  {VALUE_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 15"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="rounded-xl w-24 text-sm"
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
              <div className="flex gap-1.5 flex-wrap">
                {ICON_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setForm({ ...form, icon: emoji })}
                    className={`text-lg w-9 h-9 rounded-lg border transition-colors ${
                      form.icon === emoji ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Color</label>
              <div className="flex gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map(({ value, label, cls }) => (
                  <button
                    key={value}
                    title={label}
                    onClick={() => setForm({ ...form, color: value })}
                    className={`w-7 h-7 rounded-full ${cls} transition-all ${
                      form.color === value ? "ring-2 ring-offset-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Max Uses */}
            <Input
              type="number"
              min="1"
              placeholder="Max uses (blank = unlimited)"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              className="rounded-xl"
            />

            {/* Assignable Toggle */}
            <button
              onClick={() => setForm({ ...form, is_assignable: !form.is_assignable })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted/50 transition-colors"
            >
              {form.is_assignable
                ? <ToggleRight className="h-5 w-5 text-primary" />
                : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
              <span className={form.is_assignable ? "text-foreground" : "text-muted-foreground"}>
                {form.is_assignable ? "Assignable to members" : "Not assignable yet"}
              </span>
            </button>

            {/* Notes */}
            <Input
              placeholder="Internal notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl sm:col-span-2"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name.trim() || saveMutation.isPending}
              className="rounded-xl gap-1.5"
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {editing ? "Save Changes" : "Create Perk"}
            </Button>
            <Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Assigned Perks (when in member context) ── */}
      {memberId && memberPerks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Assigned to {memberName}
          </h4>
          <div className="space-y-2">
            {memberPerks.map((mp) => (
              <div key={mp.id} className="flex items-center justify-between bg-muted/30 border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{mp.perk_catalog?.icon || "🎁"}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{mp.perk_catalog?.name || "Unknown Perk"}</p>
                    <p className="text-xs text-muted-foreground">
                      Assigned {format(new Date(mp.assigned_at), "MMM d, yyyy")}
                      {mp.expires_at && ` · Expires ${format(new Date(mp.expires_at), "MMM d")}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[0.6rem] capitalize ${STATUS_STYLE[mp.status] || ""}`}>
                    {mp.status}
                  </Badge>
                  {mp.status === "active" && (
                    <button
                      onClick={() => updateMemberPerkStatus.mutate({ id: mp.id, status: "redeemed" })}
                      className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors"
                    >
                      Mark Redeemed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Catalog List ── */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : catalog.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <Gift className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No perks created yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Click "New Perk" to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Perks</h4>
          {catalog.map((item) => {
            const isExpanded = expandedId === item.id;
            const alreadyAssigned = isAssigned(item.id);

            return (
              <div
                key={item.id}
                className={`border rounded-2xl overflow-hidden transition-all ${
                  item.is_active ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"
                }`}
              >
                {/* Row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Color dot + icon */}
                  <div className={`h-9 w-9 rounded-xl ${colorCls(item.color)} flex items-center justify-center text-lg shrink-0`}>
                    {item.icon || "🎁"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <span className="text-[0.6rem] uppercase tracking-wider font-medium text-muted-foreground border border-border rounded-full px-2 py-0.5">
                        {item.perk_type.replace("_", " ")}
                      </span>
                      {!item.is_active && (
                        <span className="text-[0.6rem] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">Inactive</span>
                      )}
                      {!item.is_assignable && (
                        <span className="text-[0.6rem] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">Draft</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {valueLabel(item)}
                      {item.max_uses ? ` · Max ${item.max_uses} uses` : " · Unlimited"}
                      {" · "}{item.times_assigned} assigned
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Assign button (only in member context) */}
                    {memberId && item.is_assignable && item.is_active && (
                      <Button
                        size="sm"
                        variant={alreadyAssigned ? "secondary" : "outline"}
                        className="rounded-xl gap-1 text-xs h-7"
                        disabled={alreadyAssigned || assignMutation.isPending}
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        {alreadyAssigned ? (
                          <><Check className="h-3 w-3" /> Assigned</>
                        ) : (
                          <><Send className="h-3 w-3" /> Assign</>
                        )}
                      </Button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: item.id, is_active: item.is_active })}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={item.is_active ? "Deactivate" : "Activate"}
                    >
                      {item.is_active
                        ? <ToggleRight className="h-4 w-4 text-primary" />
                        : <ToggleLeft className="h-4 w-4" />}
                    </button>

                    {/* Expand (non-member context) */}
                    {!memberId && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail / assign panel */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 bg-muted/20 space-y-3">
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic">Note: {item.notes}</p>
                    )}

                    {/* Assign confirm panel (member context) */}
                    {memberId && !alreadyAssigned && (
                      <div className="space-y-2 pt-1">
                        <Input
                          placeholder="Optional assignment note"
                          value={assignNotes}
                          onChange={(e) => setAssignNotes(e.target.value)}
                          className="rounded-xl text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="rounded-xl gap-1.5 text-xs"
                            disabled={assignMutation.isPending}
                            onClick={() => assignMutation.mutate(item.id)}
                          >
                            {assignMutation.isPending
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Send className="h-3 w-3" />}
                            Confirm Assignment
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => setExpandedId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {!memberId && (
                      <p className="text-[0.65rem] text-muted-foreground">
                        Created {format(new Date(item.created_at), "MMM d, yyyy")}
                        {item.max_uses ? ` · ${item.times_assigned}/${item.max_uses} uses` : ` · ${item.times_assigned} total assignments`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
