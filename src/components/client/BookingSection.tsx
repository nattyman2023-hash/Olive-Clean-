import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Loader2, Plus, X } from "lucide-react";

interface ClientInfo {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

const FALLBACK_PACKAGES = [
  { key: "Essential Clean", description: "Quick refresh — kitchens, baths, floors, and surfaces.", price: 120 },
  { key: "General Clean", description: "Full home clean including dusting, mopping, and appliances.", price: 180 },
  { key: "Signature Deep Clean", description: "Baseboards, fixtures, cabinet fronts, interior windows, and more.", price: 280 },
  { key: "Makeover Deep Clean", description: "Move-in/move-out level — inside ovens, fridges, closets, walls.", price: 380 },
];

interface BookingItem {
  service: string;
  notes: string;
}

export default function BookingSection({ client }: { client: ClientInfo }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState<BookingItem[]>([]);
  const [frequency, setFrequency] = useState("one-time");
  const [homeType, setHomeType] = useState("house");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [packages, setPackages] = useState(FALLBACK_PACKAGES);

  useEffect(() => {
    supabase.from("service_templates" as any).select("name, description, default_price").eq("show_on_portal", true).eq("is_active", true).order("name").then(({ data }) => {
      if (data && data.length > 0) {
        setPackages((data as any[]).map(d => ({ key: d.name, description: d.description || "", price: d.default_price || 0 })));
      }
    });
  }, []);

  const openBooking = (service: string) => {
    setItems([{ service, notes: "" }]);
    setDialogOpen(true);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { service: packages[0].key, notes: "" }]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof BookingItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const email = client.email || "";
      const phone = client.phone || "";

      // Dedup: check if lead with same email already exists
      let existingLeadId: string | null = null;
      if (email) {
        const { data: existing } = await supabase.from("leads").select("id").eq("email", email).eq("status", "new").maybeSingle();
        if (existing) {
          existingLeadId = existing.id;
          // Update existing lead instead of creating duplicate
          await supabase.from("leads").update({
            status: "new",
            notes: `Service: ${items[0].service}. Home: ${homeType}. ${items[0].notes || ""}`.trim(),
            frequency,
            bedrooms,
            bathrooms,
          } as any).eq("id", existing.id);
          // Add system note
          await supabase.from("crm_notes").insert({
            parent_type: "lead",
            parent_id: existing.id,
            content: `New inquiry received from client portal: ${items.map(i => i.service).join(", ")}`,
            note_type: "system",
          });
        }
      }

      if (!existingLeadId) {
        const rows = items.map((item) => ({
          name: client.name,
          email: email,
          phone: phone,
          location: client.address || null,
          frequency,
          bedrooms,
          bathrooms,
          notes: `Service: ${item.service}. Home: ${homeType}. ${item.notes || ""}`.trim(),
          source: "client_portal" as const,
          score: 80,
          status: "new" as const,
        }));
        const { error } = await supabase.from("leads").insert(rows);
        if (error) throw error;
      }

      toast.success("Booking request submitted! We'll confirm shortly.");

      // Send confirmation email for the first service
      if (client.email) {
        const confirmId = crypto.randomUUID();
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: client.email,
            idempotencyKey: `booking-confirm-${confirmId}`,
            templateData: {
              name: client.name,
              service: items[0].service,
              frequency,
              homeType,
              bedrooms,
              bathrooms,
            },
          },
        });
      }

      setDialogOpen(false);
      setItems([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Book a Cleaning</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {packages.map((pkg) => (
          <Card key={pkg.key} className="group hover:shadow-md transition-shadow">
            <CardContent className="py-4 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm text-foreground">{pkg.key}</p>
                  <span className="text-xs font-semibold text-primary tabular-nums">from ${pkg.price}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{pkg.description}</p>
              </div>
              <Button
                size="sm"
                className="mt-3 rounded-full text-xs w-full active:scale-[0.97] transition-transform"
                onClick={() => openBooking(pkg.key)}
              >
                Book Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Request a Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Services */}
            {items.map((item, idx) => (
              <div key={idx} className="bg-muted/50 rounded-xl p-3 space-y-2 relative">
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div>
                  <Label className="text-xs">Service</Label>
                  <Select value={item.service} onValueChange={(v) => updateItem(idx, "service", v)}>
                    <SelectTrigger className="rounded-xl mt-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    value={item.notes}
                    onChange={(e) => updateItem(idx, "notes", e.target.value)}
                    placeholder="Special instructions for this service..."
                    className="rounded-xl mt-1 text-sm min-h-[60px]"
                  />
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addItem} className="rounded-full text-xs w-full gap-1">
              <Plus className="h-3 w-3" /> Add Another Service
            </Button>

            {/* Referral Code */}
            <div>
              <Label className="text-xs">Referral Code (optional)</Label>
              <Input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. OLV-ABC123"
                className="rounded-xl mt-1 text-sm"
              />
            </div>

            {/* Home details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="rounded-xl mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-Time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Home Type</Label>
                <Select value={homeType} onValueChange={setHomeType}>
                  <SelectTrigger className="rounded-xl mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Bedrooms</Label>
                <Input type="number" min={1} max={10} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} className="rounded-xl mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Bathrooms</Label>
                <Input type="number" min={1} max={10} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} className="rounded-xl mt-1 text-sm" />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0}
              className="w-full rounded-full active:scale-[0.97] transition-transform"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Submit Booking Request{items.length > 1 ? ` (${items.length} services)` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
