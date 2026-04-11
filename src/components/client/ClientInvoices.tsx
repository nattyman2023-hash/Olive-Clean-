import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  items: any[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  due_date: string | null;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  stripe_checkout_url: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
};

export default function ClientInvoices({ clientId }: { clientId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setInvoices((data || []) as Invoice[]);
        setLoading(false);
      });
  }, [clientId]);

  const handlePayInvoice = async (inv: Invoice) => {
    // Use stored checkout URL if available
    if (inv.stripe_checkout_url) {
      window.open(inv.stripe_checkout_url, "_blank");
      return;
    }
    // Fallback: create a new session
    setPayingId(inv.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-invoice-payment", {
        body: { invoiceId: inv.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment session");
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => (
        <Card key={inv.id} className="overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
            className="w-full text-left p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
              <p className="text-xs text-muted-foreground">
                {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Draft"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tabular-nums">${Number(inv.total).toFixed(2)}</span>
              <Badge variant="secondary" className={`text-[0.6rem] ${STATUS_BADGE[inv.status] || ""}`}>
                {inv.status}
              </Badge>
            </div>
          </button>
          {expanded === inv.id && (
            <CardContent className="border-t border-border pt-3 pb-4 space-y-3">
              {Array.isArray(inv.items) && inv.items.length > 0 && (
                <div className="space-y-1">
                  {inv.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-foreground">{item.description || item.name || `Item ${idx + 1}`}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {item.quantity ? `${item.quantity} × ` : ""}${Number(item.amount || item.unit_price || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">${Number(inv.subtotal).toFixed(2)}</span>
                </div>
                {inv.tax_amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tax ({inv.tax_rate}%)</span>
                    <span className="tabular-nums">${Number(inv.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">${Number(inv.total).toFixed(2)}</span>
                </div>
              </div>
              {inv.due_date && (
                <p className="text-xs text-muted-foreground">
                  Due: {new Date(inv.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              {inv.notes && <p className="text-xs text-muted-foreground italic">{inv.notes}</p>}

              {/* Pay Now button for sent/overdue invoices */}
              {(inv.status === "sent" || inv.status === "overdue") && (
                <Button
                  onClick={() => handlePayInvoice(inv)}
                  disabled={payingId === inv.id}
                  className="w-full rounded-lg mt-2"
                  size="sm"
                >
                  {payingId === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-1" />
                  )}
                  Securely Pay via Stripe — ${Number(inv.total).toFixed(2)}
                </Button>
              )}
              {inv.status === "paid" && inv.paid_at && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ Paid on {new Date(inv.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
