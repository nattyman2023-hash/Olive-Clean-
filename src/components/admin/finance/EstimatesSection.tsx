import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Loader2, FileText, ArrowRight, Pencil, Eye } from "lucide-react";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";

interface Estimate {
  id: string;
  client_id: string;
  estimate_number: string;
  status: string;
  items: any[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  converted_invoice_id: string | null;
  created_at: string;
  clients?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
  converted: "bg-violet-100 text-violet-800",
};

export default function EstimatesSection() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [convertForm, setConvertForm] = useState<Estimate | null>(null);
  const [preview, setPreview] = useState<Estimate | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("estimates").select("*, clients(name)").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Failed to load estimates."); return; }
    setEstimates((data || []) as any);
  };

  useEffect(() => { fetch_(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("estimates").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update."); return; }
    toast.success(`Estimate marked as ${status}.`);

    // Send estimate-sent email when marking as "sent"
    if (status === "sent") {
      const est = estimates.find((e) => e.id === id);
      if (est) {
        const { data: client } = await supabase.from("clients").select("email, name").eq("id", est.client_id).maybeSingle();
        if (client?.email) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "estimate-sent",
              recipientEmail: client.email,
              idempotencyKey: `estimate-sent-${id}`,
              templateData: {
                clientName: client.name,
                estimateNumber: est.estimate_number,
                total: Number(est.total).toFixed(2),
                validUntil: est.valid_until ? new Date(est.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : undefined,
              },
            },
          });
        }
      }
    }

    fetch_();
  };

  if (preview) {
    return (
      <InvoicePreview
        type="estimate"
        id={preview.id}
        number={preview.estimate_number}
        clientName={preview.clients?.name || "Unknown"}
        items={preview.items}
        subtotal={preview.subtotal}
        taxRate={preview.tax_rate}
        taxAmount={preview.tax_amount}
        total={preview.total}
        notes={preview.notes}
        date={preview.created_at}
        dueDate={preview.valid_until}
        status={preview.status}
        onClose={() => setPreview(null)}
        onSaved={() => fetch_()}
      />
    );
  }

  if (convertForm) {
    return (
      <InvoiceForm
        type="invoice"
        onClose={() => setConvertForm(null)}
        onSaved={async () => {
          await supabase.from("estimates").update({ status: "converted" }).eq("id", convertForm.id);
          setConvertForm(null);
          fetch_();
        }}
        initial={{
          client_id: convertForm.client_id,
          items: convertForm.items,
          notes: convertForm.notes || "",
          tax_rate: convertForm.tax_rate,
          estimate_id: convertForm.id,
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Estimates</h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg"><Plus className="h-4 w-4 mr-1" />New Estimate</Button>
      </div>

      {showForm && <InvoiceForm type="estimate" onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch_(); }} />}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : estimates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><p className="text-sm text-muted-foreground">No estimates yet.</p></div>
      ) : (
        <div className="space-y-2">
          {estimates.map((est) => (
            <div key={est.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <button onClick={() => setPreview(est)} className="font-medium text-sm text-foreground hover:text-primary truncate block">{est.estimate_number}</button>
                <p className="text-xs text-muted-foreground">{est.clients?.name || "Unknown"} · ${Number(est.total).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[est.status] || STATUS_STYLES.draft}`}>{est.status}</span>
                {est.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(est.id, "sent")} className="text-xs h-7 rounded-lg">Send</Button>
                )}
                {(est.status === "sent" || est.status === "accepted") && !est.converted_invoice_id && (
                  <Button size="sm" variant="outline" onClick={() => setConvertForm(est)} className="text-xs h-7 rounded-lg"><ArrowRight className="h-3 w-3 mr-1" />To Invoice</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
