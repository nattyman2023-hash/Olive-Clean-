import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Loader2, FileText, Pencil, Eye, Send } from "lucide-react";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";

interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  status: string;
  items: any[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  due_date: string | null;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
  clients?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
};

export default function InvoicesSection({ readOnly }: { readOnly?: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [previewEditMode, setPreviewEditMode] = useState(false);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("invoices").select("*, clients(name)").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Failed to load invoices."); return; }
    setInvoices((data || []) as any);
  };

  useEffect(() => { fetch_(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === "paid") update.paid_at = new Date().toISOString();
    const { error } = await supabase.from("invoices").update(update).eq("id", id);
    if (error) { toast.error("Failed to update."); return; }
    toast.success(`Invoice marked as ${status}.`);
    fetch_();
  };

  const handleFinalize = async (id: string) => {
    setFinalizingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("finalize-invoice", {
        body: { invoiceId: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Invoice finalized and sent!");
      fetch_();
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize invoice");
    } finally {
      setFinalizingId(null);
    }
  };

  if (preview) {
    return (
      <InvoicePreview
        type="invoice"
        id={preview.id}
        number={preview.invoice_number}
        clientName={preview.clients?.name || "Unknown"}
        items={preview.items}
        subtotal={preview.subtotal}
        taxRate={preview.tax_rate}
        taxAmount={preview.tax_amount}
        total={preview.total}
        notes={preview.notes}
        date={preview.issued_at}
        dueDate={preview.due_date}
        status={preview.status}
        onClose={() => { setPreview(null); setPreviewEditMode(false); }}
        onSaved={() => fetch_()}
        initialEditMode={previewEditMode}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Invoices</h3>
        {!readOnly && <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg"><Plus className="h-4 w-4 mr-1" />New Invoice</Button>}
      </div>

      {showForm && <InvoiceForm type="invoice" onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch_(); }} />}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : invoices.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><p className="text-sm text-muted-foreground">No invoices yet.</p></div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <button onClick={() => setPreview(inv)} className="font-medium text-sm text-foreground hover:text-primary truncate block">{inv.invoice_number}</button>
                <p className="text-xs text-muted-foreground">{inv.clients?.name || "Unknown"} · ${Number(inv.total).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[inv.status] || STATUS_STYLES.draft}`}>{inv.status}</span>
                <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(false); setPreview(inv); }} className="h-7 w-7" title="View"><Eye className="h-3.5 w-3.5" /></Button>
                {!readOnly && <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(true); setPreview(inv); }} className="h-7 w-7" title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}
                {!readOnly && inv.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => handleFinalize(inv.id)} disabled={finalizingId === inv.id} className="text-xs h-7 rounded-lg">
                    {finalizingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                    Finalize & Send
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
