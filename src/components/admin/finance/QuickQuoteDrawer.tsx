import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import ClientLookupOrCreate from "@/components/admin/shared/ClientLookupOrCreate";
import InvoiceForm from "@/components/admin/finance/InvoiceForm";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Walk-in / phone-in quote flow.
 * Step 1: lookup or create a client inline.
 * Step 2: build an estimate via InvoiceForm prefilled with that client_id.
 */
export default function QuickQuoteDrawer({ open, onClose, onSaved }: Props) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  const reset = () => {
    setClientId(null);
    setClientName(null);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Quick Quote</SheetTitle>
          <SheetDescription className="text-xs">
            Find or add a client, then build the quote. Default expiry is 14 days.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">1. Client</p>
            <ClientLookupOrCreate
              resolvedClientId={clientId}
              resolvedClientName={clientName}
              onResolved={(id, name) => { setClientId(id); setClientName(name); }}
              onClear={reset}
            />
          </div>

          {clientId && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">2. Quote details</p>
              <InvoiceForm
                type="estimate"
                initial={{
                  client_id: clientId,
                  items: [{ description: "Cleaning Service", qty: 1, rate: 0 }],
                  notes: "",
                  tax_rate: 0,
                }}
                onClose={() => { reset(); onClose(); }}
                onSaved={() => { reset(); onSaved(); onClose(); }}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}