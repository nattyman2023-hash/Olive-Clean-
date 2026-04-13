import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Loader2, FileText, ArrowRight, Pencil, Eye, Send, Clock,
  RefreshCw, Search, Filter, CalendarClock, ChevronDown, Check
} from "lucide-react";
import InvoiceForm from "./finance/InvoiceForm";
import InvoicePreview from "./finance/InvoicePreview";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  scheduled_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  view_count: number;
  approved_at: string | null;
  approval_token: string | null;
  clients?: { name: string; email: string | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-100 text-amber-800",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-indigo-100 text-indigo-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
  converted: "bg-violet-100 text-violet-800",
};

export default function QuotesTab({ readOnly }: { readOnly?: boolean }) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [prefillInitial, setPrefillInitial] = useState<any>(undefined);
  const [convertForm, setConvertForm] = useState<Estimate | null>(null);
  const [preview, setPreview] = useState<Estimate | null>(null);
  const [previewEditMode, setPreviewEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [prefillLeadId, setPrefillLeadId] = useState<string | null>(null);

  // Check for lead-to-quote prefill on mount
  useEffect(() => {
    const raw = sessionStorage.getItem("prefill-quote");
    if (raw) {
      sessionStorage.removeItem("prefill-quote");
      try {
        const data = JSON.parse(raw);
        setPrefillLeadId(data.leadId || null);
        // Find or create client, then open form with prefilled data
        const setupPrefill = async () => {
          let clientId = "";
          if (data.email) {
            const { data: existing } = await supabase.from("clients").select("id").eq("email", data.email).maybeSingle();
            if (existing) {
              clientId = existing.id;
            } else {
              const { data: newClient } = await supabase.from("clients").insert({
                name: data.name || "New Client",
                email: data.email,
                phone: data.phone,
                address: data.address,
              }).select("id").single();
              if (newClient) clientId = newClient.id;
            }
          }
          const serviceName = data.service || "Cleaning Service";
          const sizeNote = [data.bedrooms && `${data.bedrooms} bed`, data.bathrooms && `${data.bathrooms} bath`].filter(Boolean).join(" / ");
          setPrefillInitial({
            client_id: clientId,
            items: [{ description: serviceName + (sizeNote ? ` (${sizeNote})` : ""), qty: 1, rate: 0 }],
            notes: `Quote from lead: ${data.name || ""}`.trim(),
            tax_rate: 0,
          });
          setShowForm(true);
        };
        setupPrefill();
      } catch {}
    }
  }, []);
  const fetchQuotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("estimates")
      .select("*, clients(name, email)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Failed to load quotes."); return; }
    setEstimates((data || []) as any);
  };

  useEffect(() => { fetchQuotes(); }, []);

  const sendQuoteEmail = async (est: Estimate) => {
    const { data: client } = await supabase
      .from("clients")
      .select("email, name")
      .eq("id", est.client_id)
      .maybeSingle();
    if (!client?.email) {
      toast.error("Client has no email address.");
      return;
    }
    const siteUrl = window.location.origin;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "estimate-sent",
        recipientEmail: client.email,
        idempotencyKey: `estimate-sent-${est.id}-${Date.now()}`,
        templateData: {
          clientName: client.name,
          estimateNumber: est.estimate_number,
          total: Number(est.total).toFixed(2),
          validUntil: est.valid_until
            ? new Date(est.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : undefined,
          approvalToken: est.approval_token,
          quoteUrl: `${siteUrl}/quote/${est.approval_token}`,
        },
      },
    });
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "sent") updates.sent_at = new Date().toISOString();
    const { error } = await supabase.from("estimates").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update."); return; }
    toast.success(`Quote marked as ${status}.`);

    if (status === "sent") {
      const est = estimates.find((e) => e.id === id);
      if (est) await sendQuoteEmail(est);
    }
    fetchQuotes();
  };

  const scheduleQuote = async (id: string) => {
    if (!scheduleDate) { toast.error("Pick a date."); return; }
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    const { error } = await supabase
      .from("estimates")
      .update({ status: "scheduled", scheduled_at: scheduledAt })
      .eq("id", id);
    if (error) { toast.error("Failed to schedule."); return; }
    toast.success("Quote scheduled.");
    setScheduleTarget(null);
    setScheduleDate("");
    fetchQuotes();
  };

  const resendQuote = async (est: Estimate) => {
    await sendQuoteEmail(est);
    toast.success("Quote resent.");
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
        onSaved={fetchQuotes}
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
          fetchQuotes();
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

  const filtered = estimates.filter((e) => {
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchSearch = !search ||
      e.estimate_number.toLowerCase().includes(search.toLowerCase()) ||
      (e.clients?.name || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Quote Engine
        </h3>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg">
            <Plus className="h-4 w-4 mr-1" />New Quote
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes..."
            className="pl-10 rounded-xl"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border text-foreground"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      {showForm && (
        <InvoiceForm
          type="estimate"
          onClose={() => { setShowForm(false); setPrefillInitial(undefined); }}
          onSaved={async () => {
            setShowForm(false);
            setPrefillInitial(undefined);
            // If this was from a lead, mark it as quoted
            if (prefillLeadId) {
              await supabase.from("leads").update({ status: "quoted" } as any).eq("id", prefillLeadId);
              setPrefillLeadId(null);
            }
            fetchQuotes();
          }}
          initial={prefillInitial}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No quotes yet. Create your first quote above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((est) => (
            <div key={est.id} className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => setPreview(est)}
                  className="font-medium text-sm text-foreground hover:text-primary truncate block"
                >
                  {est.estimate_number}
                </button>
                <p className="text-xs text-muted-foreground">
                  {est.clients?.name || "Unknown"} · ${Number(est.total).toFixed(2)}
                  {est.scheduled_at && est.status === "scheduled" && (
                    <span className="ml-2">
                      <CalendarClock className="inline h-3 w-3 mr-0.5" />
                      {new Date(est.scheduled_at).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Status badge */}
                <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[est.status] || STATUS_STYLES.draft}`}>
                  {est.status}
                </span>
                {/* View count indicator */}
                {est.view_count > 0 && (
                  <span className="text-[0.65rem] text-muted-foreground flex items-center gap-0.5">
                    <Eye className="h-3 w-3" />{est.view_count}x
                  </span>
                )}

                {/* View button */}
                <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(false); setPreview(est); }} className="h-7 w-7" title="View">
                  <Eye className="h-3.5 w-3.5" />
                </Button>

                {/* Edit button */}
                {!readOnly && (
                  <Button size="icon" variant="ghost" onClick={() => { setPreviewEditMode(true); setPreview(est); }} className="h-7 w-7" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* Draft actions: Send Now / Schedule */}
                {!readOnly && est.status === "draft" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(est.id, "sent")} className="text-xs h-7 rounded-lg">
                      <Send className="h-3 w-3 mr-1" />Send Now
                    </Button>
                    <Popover open={scheduleTarget === est.id} onOpenChange={(open) => { if (!open) setScheduleTarget(null); else setScheduleTarget(est.id); }}>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs h-7 rounded-lg">
                          <Clock className="h-3 w-3 mr-1" />Schedule
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 space-y-3" align="end">
                        <p className="text-xs font-medium text-foreground">Schedule Send</p>
                        <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-lg" />
                        <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="rounded-lg" />
                        <Button size="sm" onClick={() => scheduleQuote(est.id)} className="w-full rounded-lg">
                          <CalendarClock className="h-3.5 w-3.5 mr-1" />Confirm Schedule
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </>
                )}

                {/* Resend for sent/viewed quotes */}
                {!readOnly && (est.status === "sent" || est.status === "viewed") && (
                  <Button size="sm" variant="outline" onClick={() => resendQuote(est)} className="text-xs h-7 rounded-lg">
                    <RefreshCw className="h-3 w-3 mr-1" />Resend
                  </Button>
                )}

                {/* Convert to Invoice */}
                {!readOnly && (est.status === "sent" || est.status === "accepted" || est.status === "viewed") && !est.converted_invoice_id && (
                  <Button size="sm" variant="outline" onClick={() => setConvertForm(est)} className="text-xs h-7 rounded-lg">
                    <ArrowRight className="h-3 w-3 mr-1" />To Invoice
                  </Button>
                )}

                {/* Accepted indicator */}
                {est.status === "accepted" && est.approved_at && (
                  <span className="text-[0.6rem] text-emerald-700 flex items-center gap-0.5">
                    <Check className="h-3 w-3" />
                    {new Date(est.approved_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
