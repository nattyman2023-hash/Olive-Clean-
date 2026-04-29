import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, X, Zap } from "lucide-react";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface InvoiceFormProps {
  type: "invoice" | "estimate";
  onClose: () => void;
  onSaved: () => void;
  initial?: {
    client_id: string;
    items: LineItem[];
    notes: string;
    tax_rate: number;
    due_date?: string;
    valid_until?: string;
    estimate_id?: string;
  };
}

export default function InvoiceForm({ type, onClose, onSaved, initial }: InvoiceFormProps) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; description: string | null; default_price: number | null }[]>([]);
  const [clientId, setClientId] = useState(initial?.client_id || "");
  const [items, setItems] = useState<LineItem[]>(initial?.items || [{ description: "", qty: 1, rate: 0 }]);
  const [taxRate, setTaxRate] = useState(initial?.tax_rate?.toString() || "0");
  const [notes, setNotes] = useState(initial?.notes || "");
  // Default quote expiry = today + 14 days when creating an estimate
  const defaultValidUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();
  const [dueDate, setDueDate] = useState(initial?.due_date || "");
  const [validUntil, setValidUntil] = useState(
    initial?.valid_until || (type === "estimate" ? defaultValidUntil : "")
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => setClients(data || []));
    supabase.from("service_templates").select("id, name, description, default_price").eq("is_active", true).order("name").then(({ data }) => setServices(data || []));
  }, []);

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = subtotal * (parseFloat(taxRate) || 0) / 100;
  const total = subtotal + tax;

  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...items];
    if (field === "description") updated[idx].description = value;
    else updated[idx][field] = parseFloat(value) || 0;
    setItems(updated);
  };

  const save = async () => {
    if (!clientId) { toast.error("Select a client."); return; }
    if (items.length === 0 || items.every(i => !i.description)) { toast.error("Add at least one line item."); return; }
    setSaving(true);

    const payload: any = {
      client_id: clientId,
      items: items as any,
      subtotal,
      tax_rate: parseFloat(taxRate) || 0,
      tax_amount: tax,
      total,
      notes: notes || null,
    };

    if (type === "invoice") {
      payload.invoice_number = `INV-${Date.now().toString(36).toUpperCase()}`;
      payload.due_date = dueDate || null;
      if (initial?.estimate_id) payload.estimate_id = initial.estimate_id;
      const { error } = await supabase.from("invoices").insert(payload);
      setSaving(false);
      if (error) { toast.error("Failed to create invoice."); return; }
      toast.success("Invoice created.");
    } else {
      payload.estimate_number = `EST-${Date.now().toString(36).toUpperCase()}`;
      payload.valid_until = validUntil || null;
      payload.approval_token = crypto.randomUUID();
      const { error } = await supabase.from("estimates").insert(payload);
      setSaving(false);
      if (error) { toast.error("Failed to create estimate."); return; }
      toast.success("Estimate created.");
    }
    onSaved();
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">New {type === "invoice" ? "Invoice" : "Estimate"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
          <option value="">Select Client *</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {type === "invoice" ? (
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Due Date" className="rounded-lg" />
        ) : (
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="Valid Until" className="rounded-lg" />
        )}
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Line Items</p>
          {type === "estimate" && services.length > 0 && (
            <select
              onChange={(e) => {
                const svc = services.find(s => s.id === e.target.value);
                if (svc) {
                  setItems([...items, { description: svc.name + (svc.description ? ` — ${svc.description}` : ""), qty: 1, rate: svc.default_price || 0 }]);
                }
                e.target.value = "";
              }}
              className="px-2 py-1 rounded-lg text-xs bg-background border border-border text-foreground"
              defaultValue=""
            >
              <option value="" disabled>
                <Zap className="inline h-3 w-3" /> Add from Services
              </option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.default_price ? `— $${s.default_price}` : ""}</option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
              <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="rounded-lg text-sm" />
              <Input type="number" placeholder="Qty" value={item.qty || ""} onChange={(e) => updateItem(i, "qty", e.target.value)} className="rounded-lg text-sm" />
              <Input type="number" placeholder="Rate" value={item.rate || ""} onChange={(e) => updateItem(i, "rate", e.target.value)} className="rounded-lg text-sm" />
              <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button onClick={() => setItems([...items, { description: "", qty: 1, rate: 0 }])} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add line
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input placeholder="Tax Rate (%)" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="rounded-lg" />
        <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-lg" rows={2} />
      </div>

      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
        <div className="text-xs space-y-1 text-muted-foreground">
          <p>Subtotal: <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span></p>
          <p>Tax: <span className="font-medium text-foreground">${tax.toFixed(2)}</span></p>
        </div>
        <p className="text-lg font-bold text-foreground">${total.toFixed(2)}</p>
      </div>

      <Button onClick={save} disabled={saving} className="rounded-lg">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        Create {type === "invoice" ? "Invoice" : "Estimate"}
      </Button>
    </div>
  );
}
