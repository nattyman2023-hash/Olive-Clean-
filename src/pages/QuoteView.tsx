import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Check, FileText, X } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Textarea } from "@/components/ui/textarea";
import oliveLogo from "@/assets/olive-clean-logo.png";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface QuoteData {
  id: string;
  estimate_number: string;
  status: string;
  items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  approved_at: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  clients?: { name: string } | null;
}

export default function QuoteView() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      // Track view and get quote data
      const { data, error: err } = await supabase.functions.invoke("quote-action", {
        body: { token, action: "view" },
      });
      setLoading(false);
      if (err || data?.error) {
        setError(data?.error || "Quote not found.");
        return;
      }
      setQuote(data.quote);
      if (data.quote?.status === "accepted") setApproved(true);
      if (data.quote?.status === "declined") setDeclined(true);
    };
    load();
  }, [token]);

  const handleApprove = async () => {
    if (!token) return;
    setApproving(true);
    const { data, error: err } = await supabase.functions.invoke("quote-action", {
      body: { token, action: "approve" },
    });
    setApproving(false);
    if (err || data?.error) return;
    setApproved(true);
    if (quote) setQuote({ ...quote, status: "accepted", approved_at: new Date().toISOString() });
  };

  const handleDecline = async () => {
    if (!token) return;
    setDeclining(true);
    const { data, error: err } = await supabase.functions.invoke("quote-action", {
      body: { token, action: "decline", reason: declineReason },
    });
    setDeclining(false);
    if (err || data?.error) return;
    setDeclined(true);
    setShowDeclineForm(false);
    if (quote) setQuote({ ...quote, status: "declined", declined_at: new Date().toISOString(), decline_reason: declineReason });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <p className="text-lg font-semibold text-foreground">Quote not found</p>
          <p className="text-sm text-muted-foreground">{error || "This quote link may have expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <SEOHead title={`Quote ${quote.estimate_number} — Olive Clean`} description="View and approve your quote from Olive Clean." noindex />
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={oliveLogo} alt="Olive Clean" className="h-10" />
              <div>
                <h1 className="text-lg font-bold text-foreground">Quote {quote.estimate_number}</h1>
                <p className="text-xs text-muted-foreground capitalize">{approved ? "Accepted" : quote.status}</p>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Prepared for</p>
            <p className="font-medium text-foreground">{quote.clients?.name || "Valued Customer"}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium text-foreground">{new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
            {quote.valid_until && (
              <div>
                <p className="text-xs text-muted-foreground">Valid Until</p>
                <p className="font-medium text-foreground">{new Date(quote.valid_until).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2">Service</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 text-foreground">{item.description}</td>
                  <td className="py-3 text-right text-foreground">{item.qty}</td>
                  <td className="py-3 text-right text-foreground">${Number(item.rate).toFixed(2)}</td>
                  <td className="py-3 text-right font-medium text-foreground">${(item.qty * item.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">${Number(quote.subtotal).toFixed(2)}</span>
              </div>
              {quote.tax_rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({quote.tax_rate}%)</span>
                  <span className="text-foreground">${Number(quote.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-border pt-2 text-lg">
                <span>Total</span>
                <span>${Number(quote.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{quote.notes}</p>
            </div>
          )}

          {/* Approve Button */}
          {approved ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <Check className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800">Quote Approved</p>
              <p className="text-xs text-emerald-600 mt-1">
                {quote.approved_at ? `Approved on ${new Date(quote.approved_at).toLocaleDateString()}` : "Thank you!"}
              </p>
            </div>
          ) : declined ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <X className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="font-semibold text-red-800">Quote Declined</p>
              <p className="text-xs text-red-600 mt-1">
                Thank you for letting us know. We'll be in touch.
              </p>
            </div>
          ) : showDeclineForm ? (
            <div className="space-y-3 border border-border rounded-xl p-4">
              <p className="text-sm font-medium text-foreground">Decline this quote?</p>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Optional: tell us why (price, timing, chose someone else…)"
                rows={3}
                className="rounded-lg text-sm"
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-lg" onClick={() => { setShowDeclineForm(false); setDeclineReason(""); }} disabled={declining}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1 rounded-lg" onClick={handleDecline} disabled={declining}>
                  {declining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Decline"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                size="lg"
                onClick={handleApprove}
                disabled={approving}
                className="w-full rounded-xl text-base py-6"
              >
                {approving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                Approve This Quote
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setShowDeclineForm(true)}
                className="w-full rounded-xl text-sm text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" /> Decline
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">Olive Clean · Nashville, TN</p>
            <p className="text-xs text-muted-foreground">Questions? Reply to the email or call us.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
