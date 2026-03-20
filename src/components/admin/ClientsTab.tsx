import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search,
  Plus,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Trash2,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  preferences: Record<string, string>;
  notes: string | null;
  created_at: string;
}

const NEIGHBORHOODS = ["Belle Meade", "Brentwood", "Franklin", "Green Hills", "West Nashville"];

export default function ClientsTab() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("all");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    neighborhood: "",
    notes: "",
  });
  const [prefEntries, setPrefEntries] = useState<{ key: string; value: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load clients.");
      return;
    }
    setClients(
      (data || []).map((c: any) => ({
        ...c,
        preferences: (c.preferences as Record<string, string>) || {},
      }))
    );
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", address: "", neighborhood: "", notes: "" });
    setPrefEntries([]);
    setShowForm(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      neighborhood: c.neighborhood || "",
      notes: c.notes || "",
    });
    setPrefEntries(Object.entries(c.preferences).map(([key, value]) => ({ key, value })));
    setShowForm(true);
  };

  const saveClient = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    const preferences: Record<string, string> = {};
    prefEntries.forEach((e) => {
      if (e.key.trim()) preferences[e.key.trim()] = e.value;
    });

    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      neighborhood: form.neighborhood || null,
      notes: form.notes || null,
      preferences,
      ...(editingId ? {} : { created_by: user?.id }),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("clients").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("clients").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error("Failed to save client.");
      return;
    }
    toast.success(editingId ? "Client updated." : "Client created.");
    setShowForm(false);
    fetchClients();
  };

  const filtered = clients.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search);
    const matchesNeighborhood = neighborhoodFilter === "all" || c.neighborhood === neighborhoodFilter;
    return matchesSearch && matchesNeighborhood;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={neighborhoodFilter}
            onChange={(e) => setNeighborhoodFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border text-foreground"
          >
            <option value="all">All Areas</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <Button size="sm" onClick={openNew} className="rounded-lg active:scale-[0.97]">
            <Plus className="h-4 w-4 mr-1" /> Add Client
          </Button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">{editingId ? "Edit Client" : "New Client"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground active:scale-95">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg" />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg" />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg" />
            <select
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground"
            >
              <option value="">Neighborhood</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg" />
          </div>

          {/* Preferences editor */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Household Preferences (gate codes, pets, cleaning quirks…)</p>
            <div className="space-y-2">
              {prefEntries.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Key (e.g. Gate Code)"
                    value={entry.key}
                    onChange={(e) => {
                      const updated = [...prefEntries];
                      updated[i].key = e.target.value;
                      setPrefEntries(updated);
                    }}
                    className="rounded-lg flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={entry.value}
                    onChange={(e) => {
                      const updated = [...prefEntries];
                      updated[i].value = e.target.value;
                      setPrefEntries(updated);
                    }}
                    className="rounded-lg flex-1"
                  />
                  <button
                    onClick={() => setPrefEntries(prefEntries.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setPrefEntries([...prefEntries, { key: "", value: "" }])}
                className="text-xs text-primary hover:underline active:scale-[0.97]"
              >
                + Add preference
              </button>
            </div>
          </div>

          <Button onClick={saveClient} disabled={saving} className="rounded-lg active:scale-[0.97]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {editingId ? "Update Client" : "Create Client"}
          </Button>
        </div>
      )}

      {/* Client List */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No clients found. Add your first client above.</p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left bg-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.99] ${
                  selected?.id === c.id ? "border-primary shadow-md" : "border-border shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.neighborhood || "No area"} · {c.phone || "No phone"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {Object.keys(c.preferences).length} pref{Object.keys(c.preferences).length !== 1 ? "s" : ""}
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
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.neighborhood || "No area assigned"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(selected)} className="active:scale-95">
                  Edit
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                {selected.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{selected.email}</span>
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{selected.phone}</span>
                  </div>
                )}
                {selected.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{selected.address}</span>
                  </div>
                )}
              </div>
              {Object.keys(selected.preferences).length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Preferences</p>
                  <div className="space-y-2">
                    {Object.entries(selected.preferences).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
              <User className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a client to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
