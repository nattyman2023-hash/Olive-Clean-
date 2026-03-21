import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface InvoicePreviewProps {
  type: "invoice" | "estimate";
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
}

export default function InvoicePreview({ type, number: docNumber, clientName, items, subtotal, taxRate, taxAmount, total, notes, date, dueDate, status, onClose }: InvoicePreviewProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-foreground">{type === "invoice" ? "Invoice" : "Estimate"} {docNumber}</h2>
          <p className="text-xs text-muted-foreground capitalize">{status}</p>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="print:hidden"><X className="h-4 w-4" /></Button>
        </div>
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
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 text-foreground">{item.description}</td>
              <td className="py-2 text-right text-foreground">{item.qty}</td>
              <td className="py-2 text-right text-foreground">${Number(item.rate).toFixed(2)}</td>
              <td className="py-2 text-right font-medium text-foreground">${(item.qty * item.rate).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-48 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">${Number(subtotal).toFixed(2)}</span></div>
          {taxRate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="text-foreground">${Number(taxAmount).toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold border-t border-border pt-1"><span>Total</span><span>${Number(total).toFixed(2)}</span></div>
        </div>
      </div>

      {notes && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-foreground">{notes}</p>
        </div>
      )}
    </div>
  );
}
