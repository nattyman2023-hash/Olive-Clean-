import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import InvoiceForm from "@/components/admin/finance/InvoiceForm";
import { findOrCreateClient } from "@/lib/findOrCreateClient";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  lead: any | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Slide-in drawer that wraps InvoiceForm for an estimate, prefilled from a lead.
 * Replaces the previous "navigate to /quotes" sessionStorage bounce.
 */
export default function LeadQuoteDrawer({ lead, onClose, onSaved }: Props) {
  const [initial, setInitial] = useState<any | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!lead) {
      setInitial(null);
      return;
    }
    const setup = async () => {
      setPreparing(true);
      try {
        const clientId = await findOrCreateClient({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.location,
        });
        const serviceName = lead.frequency === "one-time" ? "Deep Clean" : "General Cleaning";
        const sizeNote = [lead.bedrooms && `${lead.bedrooms} bed`, lead.bathrooms && `${lead.bathrooms} bath`]
          .filter(Boolean).join(" / ");
        setInitial({
          client_id: clientId,
          items: [{ description: serviceName + (sizeNote ? ` (${sizeNote})` : ""), qty: 1, rate: 0 }],
          notes: `Quote from lead: ${lead.name || ""}`.trim(),
          tax_rate: 0,
        });
      } catch (e: any) {
        toast.error("Could not prepare quote: " + (e.message || ""));
        onClose();
      } finally {
        setPreparing(false);
      }
    };
    setup();
  }, [lead, onClose]);

  return (
    <Sheet open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Create Quote for {lead?.name || "Lead"}</SheetTitle>
          <SheetDescription className="text-xs">
            Default expiry is 14 days. Saving will mark this lead as Quoted.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {preparing || !initial ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <InvoiceForm
              type="estimate"
              initial={initial}
              onClose={onClose}
              onSaved={async () => {
                if (lead?.id) {
                  await supabase.from("leads").update({ status: "quoted" } as any).eq("id", lead.id);
                }
                toast.success("Quote created — lead moved to Quoted");
                onSaved();
                onClose();
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}