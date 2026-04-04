import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, LayoutTemplate, X, GripVertical, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface ServiceTemplate {
  id: string;
  name: string;
  description: string | null;
  show_on_portal: boolean;
  checklist_items: string[];
  default_duration_minutes: number | null;
  default_price: number | null;
  is_active: boolean;
  created_at: string;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

const emptyForm = {
  name: "",
  description: "",
  show_on_portal: false,
  checklist_items: [] as string[],
  default_duration_minutes: "",
  default_price: "",
  is_active: true,
};

export default function ServicesManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newItem, setNewItem] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["service-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_templates" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data as any as ServiceTemplate[]) || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        show_on_portal: form.show_on_portal,
        checklist_items: form.checklist_items,
        default_duration_minutes: form.default_duration_minutes ? parseInt(form.default_duration_minutes) : null,
        default_price: form.default_price ? parseFloat(form.default_price) : null,
        is_active: form.is_active,
      };

      let serviceId: string;

      if (editing) {
        const { error } = await supabase.from("service_templates" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        serviceId = editing.id;
      } else {
        const { data, error } = await supabase.from("service_templates" as any).insert(payload).select("id").single();
        if (error) throw error;
        serviceId = (data as any).id;
      }

      // Auto-sync to Stripe if price is set and no Stripe ID exists yet
      const price = form.default_price ? parseFloat(form.default_price) : null;
      const hasStripeId = editing?.stripe_price_id;
      if (price && price > 0 && !hasStripeId) {
        try {
          await supabase.functions.invoke("sync-stripe-product", {
            body: {
              serviceId,
              name: form.name,
              description: form.description || null,
              price,
            },
          });
        } catch {
          // Non-blocking — Stripe sync can be retried manually
          console.warn("Stripe sync failed, can be retried manually");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-templates"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(editing ? "Service updated." : "Service created & synced to payments.");
    },
    onError: () => toast.error("Failed to save service."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-templates"] });
      setDeleteId(null);
      toast.success("Service deleted.");
    },
  });

  const togglePortalMutation = useMutation({
    mutationFn: async ({ id, show }: { id: string; show: boolean }) => {
      const { error } = await supabase.from("service_templates" as any).update({ show_on_portal: show }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service-templates"] }),
  });

  const syncToStripe = async (t: ServiceTemplate) => {
    if (!t.default_price || t.default_price <= 0) {
      toast.error("Set a price before syncing to Stripe.");
      return;
    }
    setSyncingId(t.id);
    try {
      const { error } = await supabase.functions.invoke("sync-stripe-product", {
        body: {
          serviceId: t.id,
          name: t.name,
          description: t.description || null,
          price: t.default_price,
        },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["service-templates"] });
      toast.success("Synced to Stripe!");
    } catch (err: any) {
      toast.error(err.message || "Failed to sync to Stripe.");
    } finally {
      setSyncingId(null);
    }
  };

  const openEdit = (t: ServiceTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || "",
      show_on_portal: t.show_on_portal,
      checklist_items: t.checklist_items || [],
      default_duration_minutes: t.default_duration_minutes ? String(t.default_duration_minutes) : "",
      default_price: t.default_price ? String(t.default_price) : "",
      is_active: t.is_active,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    setForm(f => ({ ...f, checklist_items: [...f.checklist_items, newItem.trim()] }));
    setNewItem("");
  };

  const removeChecklistItem = (idx: number) => {
    setForm(f => ({ ...f, checklist_items: f.checklist_items.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" /> Job Templates / Services
        </h2>
        <Button size="sm" onClick={openNew} className="rounded-lg"><Plus className="h-4 w-4 mr-1" />Add Service</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : templates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><p className="text-sm text-muted-foreground">No service templates yet.</p></div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground">{t.name}</p>
                  {!t.is_active && <span className="text-[0.6rem] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Inactive</span>}
                  {t.stripe_price_id && (
                    <span className="text-[0.6rem] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <CreditCard className="h-2.5 w-2.5" /> Stripe
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                <div className="flex items-center gap-3 mt-1 text-[0.65rem] text-muted-foreground">
                  {t.checklist_items?.length > 0 && <span>{t.checklist_items.length} checklist items</span>}
                  {t.default_duration_minutes && <span>{t.default_duration_minutes} min</span>}
                  {t.default_price && <span>${t.default_price}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={t.show_on_portal}
                    onCheckedChange={(checked) => togglePortalMutation.mutate({ id: t.id, show: checked })}
                    className="scale-75"
                  />
                  <span className="text-[0.6rem] text-muted-foreground whitespace-nowrap">Portal</span>
                </div>
                {!t.stripe_price_id && t.default_price && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => syncToStripe(t)}
                    disabled={syncingId === t.id}
                    title="Sync to Stripe"
                  >
                    {syncingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 text-primary" />}
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "New Service Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-lg" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Default Duration (min)</Label>
                <Input value={form.default_duration_minutes} onChange={(e) => setForm(f => ({ ...f, default_duration_minutes: e.target.value }))} className="rounded-lg" />
              </div>
              <div>
                <Label className="text-xs">Default Price ($)</Label>
                <Input value={form.default_price} onChange={(e) => setForm(f => ({ ...f, default_price: e.target.value }))} className="rounded-lg" />
              </div>
            </div>
            {!editing?.stripe_price_id && form.default_price && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> A corresponding Stripe product will be created automatically.
              </p>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.show_on_portal} onCheckedChange={(c) => setForm(f => ({ ...f, show_on_portal: c }))} />
              <Label className="text-xs">Show on Customer Portal</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm(f => ({ ...f, is_active: c }))} />
              <Label className="text-xs">Active</Label>
            </div>
            {/* Checklist */}
            <div>
              <Label className="text-xs mb-2 block">Checklist Items</Label>
              {form.checklist_items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1">
                  <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground flex-1">{item}</span>
                  <button onClick={() => removeChecklistItem(idx)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add task..." className="rounded-lg text-xs" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())} />
                <Button size="sm" variant="outline" onClick={addChecklistItem} className="rounded-lg shrink-0">Add</Button>
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="w-full rounded-lg">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Update" : "Create"} Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Existing jobs using this service won't be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
