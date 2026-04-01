import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Printer, Pencil, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import oliveLogo from "@/assets/olive-clean-logo.png";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface InvoicePreviewProps {
  type: "invoice" | "estimate";
  id: string;
  number: string;
  clientName: string;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  date: string;
  dueDate?: string | null;
  status: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function InvoicePreview({ type, id, number: docNumber, clientName, items: initialItems, subtotal: initialSubtotal, taxRate: initialTaxRate, taxAmount: initialTaxAmount, total: initialTotal, notes: initialNotes, date, dueDate, status, onClose, onSaved }: InvoicePreviewProps) {
  const [editMode, setEditMode] = useState(false);
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...items];
    if (field === "description") {
      updated[index] = { ...updated[index], description: value };
    } else {
      updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    }
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description: "", qty: 1, rate: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    const table = type === "invoice" ? "invoices" : "estimates";
    const { error } = await supabase
      .from(table)
      .update({
        items: items as any,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: notes || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save changes.");
      return;
    }
    toast.success("Changes saved.");
    setEditMode(false);
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <img src={oliveLogo} alt="Olive Clean" className="h-10" />
          <div>
            <h2 className="text-lg font-bold text-foreground">{type === "invoice" ? "Invoice" : "Estimate"} {docNumber}</h2>
            <p className="text-xs text-muted-foreground capitalize">{status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={editMode ? "default" : "ghost"}
            onClick={() => setEditMode(!editMode)}
            className="print:hidden"
            title={editMode ? "Exit edit mode" : "Edit"}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="print:hidden"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Business Info */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Olive Clean</p>
        <p>Nashville, TN</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Bill To</p>
          <p className="font-medium text-foreground">{clientName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="font-medium text-foreground">{new Date(date).toLocaleDateString()}</p>
          {dueDate && (
            <>
              <p className="text-xs text-muted-foreground mt-1">Due Date</p>
              <p className="font-medium text-foreground">{new Date(dueDate).toLocaleDateString()}</p>
            </>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-2">Description</th>
            <th className="pb-2 text-right">Qty</th>
            <th className="pb-2 text-right">Rate</th>
            <th className="pb-2 text-right">Amount</th>
            {editMode && <th className="pb-2 w-8" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2">
                {editMode ? (
                  <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="h-7 text-xs rounded-md" />
                ) : (
                  <span className="text-foreground">{item.description}</span>
                )}
              </td>
              <td className="py-2 text-right">
                {editMode ? (
                  <Input type="number" value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} className="h-7 text-xs rounded-md w-16 ml-auto text-right" />
                ) : (
                  <span className="text-foreground">{item.qty}</span>
                )}
              </td>
              <td className="py-2 text-right">
                {editMode ? (
                  <Input type="number" step="0.01" value={item.rate} onChange={(e) => updateItem(i, "rate", e.target.value)} className="h-7 text-xs rounded-md w-20 ml-auto text-right" />
                ) : (
                  <span className="text-foreground">${Number(item.rate).toFixed(2)}</span>
                )}
              </td>
              <td className="py-2 text-right font-medium text-foreground">${(item.qty * item.rate).toFixed(2)}</td>
              {editMode && (
                <td className="py-2">
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editMode && (
        <button onClick={addItem} className="text-xs text-primary hover:underline">+ Add line item</button>
      )}

      <div className="flex justify-end">
        <div className="w-48 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tax</span>
            {editMode ? (
              <div className="flex items-center gap-1">
                <Input type="number" step="0.1" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="h-6 text-xs rounded-md w-14 text-right" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ) : (
              <span className="text-foreground">{taxRate > 0 ? `${taxRate}% = $${taxAmount.toFixed(2)}` : "$0.00"}</span>
            )}
          </div>
          <div className="flex justify-between font-bold border-t border-border pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Notes */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-1">Notes</p>
        {editMode ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-md p-2 min-h-[60px] text-foreground"
            placeholder="Add notes..."
          />
        ) : (
          <p className="text-sm text-foreground">{notes || "—"}</p>
        )}
      </div>

      {editMode && (
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => { setItems(initialItems); setTaxRate(initialTaxRate); setNotes(initialNotes || ""); setEditMode(false); }}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
