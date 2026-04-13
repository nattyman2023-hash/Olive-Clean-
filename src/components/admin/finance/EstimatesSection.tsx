import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Loader2, FileText, ArrowRight, Pencil, Eye, Briefcase, PhoneCall } from "lucide-react";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

export default function EstimatesSection({ readOnly }: { readOnly?: boolean }) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [convertForm, setConvertForm] = useState<Estimate | null>(null);
  const [preview, setPreview] = useState<Estimate | null>(null);
  const [previewEditMode, setPreviewEditMode] = useState(false);
  const [jobDialog, setJobDialog] = useState<Estimate | null>(null);
  const [jobDate, setJobDate] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [jobSaving, setJobSaving] = useState(false);

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

    // Auto-create job when accepted
    if (status === "accepted") {
      const est = estimates.find((e) => e.id === id);
      if (est) {
        const serviceName = (est.items as any)?.[0]?.description || "Cleaning Service";
        const { error: jobErr } = await supabase.from("jobs").insert({
          client_id: est.client_id,
          service: serviceName,
          scheduled_at: new Date().toISOString(),
          price: est.total,
          notes: `Auto-created from accepted quote ${est.estimate_number}`,
          status: "scheduled",
        });
        if (jobErr) { toast.error("Quote accepted but failed to create job."); }
        else { toast.success("Job auto-created from accepted quote!"); }
      }
    }

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

  const handleConvertToJob = async () => {
    if (!jobDialog || !jobDate) { toast.error("Select a scheduled date."); return; }
    setJobSaving(true);
    const serviceName = jobDialog.items?.[0]?.description || "Cleaning Service";
    const { error } = await supabase.from("jobs").insert({
      client_id: jobDialog.client_id,
      service: serviceName,
      scheduled_at: new Date(jobDate).toISOString(),
      price: jobDialog.total,
      notes: jobNotes || `Converted from ${jobDialog.estimate_number}`,
      status: "scheduled",
    });
    if (error) { toast.error("Failed to create job."); setJobSaving(false); return; }
    await supabase.from("estimates").update({ status: "converted" }).eq("id", jobDialog.id);
    toast.success("Quote converted to job!");
    setJobDialog(null);
    setJobDate("");
    setJobNotes("");
    setJobSaving(false);
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
        onClose={() => { setPreview(null); setPreviewEditMode(false); }}
        onSaved={() => fetch_()}
        initialEditMode={previewEditMode}
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

  const staleQuotes = estimates.filter((est) => {
    if (est.status !== "sent") return false;
    const sentDate = est.created_at ? new Date(est.created_at) : null;
    if (!sentDate) return false;
    return (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24) >= 7;
  });

  return (
    <div>
      {/* Stale Quotes Call List */}
      {staleQuotes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1"><PhoneCall className="h-3.5 w-3.5" /> Priority Call List ({staleQuotes.length})</p>
          <div className="space-y-1">
            {staleQuotes.map((est) => {
              const daysSent = Math.floor((Date.now() - new Date(est.created_at).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={est.id} className="flex items-center justify-between text-xs">
                  <button onClick={() => setPreview(est)} className="text-red-800 font-medium hover:underline">{est.estimate_number} — {est.clients?.name || "Unknown"}</button>
                  <span className="text-red-600">{daysSent}d no response · ${Number(est.total).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Estimates</h3>
        {!readOnly && <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg"><Plus className="h-4 w-4 mr-1" />New Estimate</Button>}
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
                <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(false); setPreview(est); }} className="h-7 w-7" title="View"><Eye className="h-3.5 w-3.5" /></Button>
                {!readOnly && <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(true); setPreview(est); }} className="h-7 w-7" title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}
                {!readOnly && est.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(est.id, "sent")} className="text-xs h-7 rounded-lg">Send</Button>
                )}
                {!readOnly && (est.status === "sent" || est.status === "accepted") && !est.converted_invoice_id && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setConvertForm(est)} className="text-xs h-7 rounded-lg"><ArrowRight className="h-3 w-3 mr-1" />To Invoice</Button>
                    <Button size="sm" variant="outline" onClick={() => { setJobDialog(est); setJobNotes(`Converted from ${est.estimate_number}`); }} className="text-xs h-7 rounded-lg"><Briefcase className="h-3 w-3 mr-1" />To Job</Button>
                  </>
                )}
                {!readOnly && est.status === "accepted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 rounded-lg"
                    onClick={async () => {
                      const { data: client } = await supabase.from("clients").select("email, name, client_user_id").eq("id", est.client_id).maybeSingle();
                      if (!client?.email) { toast.error("No email found for this client."); return; }
                      if (client.client_user_id) { toast.info("Client already has a portal account."); return; }
                      const { error } = await supabase.functions.invoke("invite-client", {
                        body: { clientId: est.client_id, email: client.email, name: client.name },
                      });
                      if (error) { toast.error("Failed to send portal invite."); return; }
                      toast.success(`Portal invitation sent to ${client.email}`);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />Invite to Portal
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convert to Job Dialog */}
      <Dialog open={!!jobDialog} onOpenChange={(open) => { if (!open) setJobDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Quote to Job</DialogTitle>
            <DialogDescription>
              Create a scheduled job from {jobDialog?.estimate_number} for {jobDialog?.clients?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Scheduled Date & Time *</label>
              <Input type="datetime-local" value={jobDate} onChange={(e) => setJobDate(e.target.value)} className="rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Service</label>
              <p className="text-sm text-foreground">{jobDialog?.items?.[0]?.description || "Cleaning Service"}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Price</label>
              <p className="text-sm font-bold text-foreground">${Number(jobDialog?.total || 0).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} className="rounded-lg" rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setJobDialog(null)}>Cancel</Button>
              <Button onClick={handleConvertToJob} disabled={jobSaving || !jobDate}>
                {jobSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Create Job
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
