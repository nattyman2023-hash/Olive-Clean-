import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Loader2, FileText, Pencil, Eye, Send, RotateCcw, DollarSign, PhoneCall } from "lucide-react";
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
  stripe_checkout_url: string | null;
  clients?: { name: string; email?: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
};

function getAgingTier(inv: Invoice): { label: string; className: string } {
  if (inv.status === "paid") return { label: "Paid", className: "bg-emerald-100 text-emerald-800" };
  if (inv.status === "draft") return { label: "Draft", className: "bg-muted text-muted-foreground" };

  const sentDate = inv.issued_at ? new Date(inv.issued_at) : new Date(inv.created_at);
  const daysSinceSent = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceSent >= 15) return { label: `${daysSinceSent}d — Action Required`, className: "bg-red-100 text-red-800 font-semibold" };
  if (daysSinceSent >= 8) return { label: `${daysSinceSent}d — Overdue`, className: "bg-orange-100 text-orange-800" };
  if (daysSinceSent >= 1) return { label: `${daysSinceSent}d`, className: "bg-yellow-100 text-yellow-800" };
  return { label: "Sent today", className: "bg-blue-100 text-blue-800" };
}

export default function InvoicesSection({ readOnly, onNavigate }: { readOnly?: boolean; onNavigate?: (section: string, targetId?: string) => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [previewEditMode, setPreviewEditMode] = useState(false);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("invoices").select("*, clients(name, email)").order("created_at", { ascending: false });
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

  const handleResend = async (inv: Invoice) => {
    const clientEmail = inv.clients?.email;
    if (!clientEmail) { toast.error("Client has no email address."); return; }
    if (!inv.stripe_checkout_url) { toast.error("No payment link available. Finalize the invoice first."); return; }
    setResendingId(inv.id);
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-issued",
          recipientEmail: clientEmail,
          idempotencyKey: `invoice-resend-${inv.id}-${Date.now()}`,
          templateData: {
            name: inv.clients?.name,
            invoiceNumber: inv.invoice_number,
            total: `$${Number(inv.total).toFixed(2)}`,
            dueDate: inv.due_date
              ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : undefined,
            paymentUrl: inv.stripe_checkout_url,
          },
        },
      });
      toast.success("Invoice resent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invoice");
    } finally {
      setResendingId(null);
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

  const totalOutstanding = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const callList = invoices.filter((inv) => {
    if (inv.status === "paid" || inv.status === "draft") return false;
    const sentDate = inv.issued_at ? new Date(inv.issued_at) : new Date(inv.created_at);
    return (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24) >= 15;
  });

  return (
    <div>
      {/* Outstanding Summary */}
      {totalOutstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-800">Total Outstanding</p>
            <p className="text-xl font-bold text-amber-900">${totalOutstanding.toFixed(2)}</p>
          </div>
          <DollarSign className="h-6 w-6 text-amber-500" />
        </div>
      )}

      {/* Call List */}
      {callList.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1"><PhoneCall className="h-3.5 w-3.5" /> Priority Call List ({callList.length})</p>
          <div className="space-y-1">
            {callList.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-xs">
                <button onClick={() => setPreview(inv)} className="text-red-800 font-medium hover:underline">{inv.invoice_number} — {inv.clients?.name || "Unknown"}</button>
                <span className="text-red-600 font-semibold">${Number(inv.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          {invoices.map((inv) => {
            const aging = getAgingTier(inv);
            return (
            <div key={inv.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <button onClick={() => setPreview(inv)} className="font-medium text-sm text-foreground hover:text-primary truncate block">{inv.invoice_number}</button>
                <p className="text-xs text-muted-foreground">
                  <button onClick={(e) => { e.stopPropagation(); onNavigate?.("clients", inv.client_id); }} className="hover:text-primary hover:underline underline-offset-2">{inv.clients?.name || "Unknown"}</button>
                  {" · "}${Number(inv.total).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${aging.className}`}>{aging.label}</span>
                <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(false); setPreview(inv); }} className="h-7 w-7" title="View"><Eye className="h-3.5 w-3.5" /></Button>
                {!readOnly && <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(true); setPreview(inv); }} className="h-7 w-7" title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}
                {!readOnly && inv.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => handleFinalize(inv.id)} disabled={finalizingId === inv.id} className="text-xs h-7 rounded-lg">
                    {finalizingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                    Finalize & Send
                  </Button>
                )}
                {!readOnly && inv.status === "sent" && (
                  <Button size="sm" variant="ghost" onClick={() => handleResend(inv)} disabled={resendingId === inv.id} className="text-xs h-7 rounded-lg" title="Resend Invoice">
                    {resendingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
