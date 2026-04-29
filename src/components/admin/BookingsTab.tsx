import { useEffect, useState } from "react";
import { useIsDesktop } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AddressInput, formatAddress } from "@/components/ui/AddressInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Home,
  Calendar,
  Loader2,
  Plus,
  X,
} from "lucide-react";

interface BookingRequest {
  id: string;
  service: string;
  home_type: string;
  bedrooms: number;
  bathrooms: number;
  frequency: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  referral_code: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "text-olive-gold bg-olive-gold/10" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, className: "text-primary bg-primary/10" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-secondary bg-secondary/10" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "text-destructive bg-destructive/10" },
};

export default function BookingsTab({ readOnly }: { readOnly?: boolean }) {
  const isDesktop = useIsDesktop();
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<BookingRequest | null>(null);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", service: "general", home_type: "house", bedrooms: "3", bathrooms: "2", frequency: "weekly", address: "", notes: "" });
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Failed to load bookings.");
      return;
    }
    setBookings(data || []);
  };

  const handleAddBooking = async () => {
    if (!addForm.name || !addForm.email || !addForm.phone) { toast.error("Name, email, and phone are required."); return; }
    setAddSaving(true);

    // Smart routing: check if email belongs to existing client
    const { data: existingClient } = await supabase.from("clients").select("id, name").eq("email", addForm.email).maybeSingle();

    // Insert booking request
    const { error } = await supabase.from("booking_requests").insert({
      name: addForm.name,
      email: addForm.email,
      phone: addForm.phone,
      service: addForm.service,
      home_type: addForm.home_type,
      bedrooms: parseInt(addForm.bedrooms),
      bathrooms: parseInt(addForm.bathrooms),
      frequency: addForm.frequency,
      address: addForm.address || null,
      notes: addForm.notes || null,
      status: "pending",
    });
    setAddSaving(false);
    if (error) { toast.error("Failed to create booking."); return; }

    if (existingClient) {
      toast.success(`Booking created for existing client "${existingClient.name}" — tagged as Potential Booking.`);
    } else {
      toast.success("Booking created from new contact — tagged as Potential Lead.");
      // Also create a lead entry for new contacts
      await supabase.from("leads").insert({
        name: addForm.name,
        email: addForm.email,
        phone: addForm.phone,
        location: addForm.address || null,
        source: "admin_manual",
        score: 50,
        status: "new",
        bedrooms: parseInt(addForm.bedrooms) || null,
        bathrooms: parseInt(addForm.bathrooms) || null,
        frequency: addForm.frequency,
        notes: `Manual booking entry. ${addForm.notes || ""}`.trim(),
      });
    }

    setShowAddBooking(false);
    setAddForm({ name: "", email: "", phone: "", service: "general", home_type: "house", bedrooms: "3", bathrooms: "2", frequency: "weekly", address: "", notes: "" });
    fetchBookings();
  };

  const inviteClient = async (booking: BookingRequest) => {
    try {
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: { email: booking.email, name: booking.name, address: booking.address },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Account setup email sent to ${booking.email}`);
    } catch (err: any) {
      logger.error("Invite error", err);
      toast.error(err.message || "Failed to send invitation.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("booking_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status.");
      return;
    }
    toast.success(`Status updated to ${status}.`);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    if (selected?.id === id) setSelected({ ...selected, status });

    if (status === "confirmed") {
      const booking = bookings.find((b) => b.id === id);
      if (booking) {
        // Send booking confirmation email
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: booking.email,
            idempotencyKey: `booking-confirm-${id}`,
            templateData: {
              name: booking.name,
              service: booking.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              frequency: booking.frequency,
              homeType: booking.home_type,
              bedrooms: booking.bedrooms,
              bathrooms: booking.bathrooms,
            },
          },
        }).catch((err) => logger.error("Booking confirmation email failed", err));
        // Auto-invite client
        inviteClient(booking);
        // Find or create client record, then create a scheduled job
        let clientId: string | null = null;
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("email", booking.email)
          .maybeSingle();
        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient } = await supabase
            .from("clients")
            .insert({ name: booking.name, email: booking.email, phone: booking.phone, address: booking.address })
            .select("id")
            .single();
          clientId = newClient?.id || null;
        }
        if (clientId) {
          // Link referral code: if booking has a referral code, find the referring member and set referred_by
          if ((booking as any).referral_code) {
            const { data: referrer } = await supabase
              .from("perks_members")
              .select("id")
              .eq("referral_code", (booking as any).referral_code)
              .eq("status", "active")
              .maybeSingle();
            if (referrer) {
              // Check if this new client already has a perks membership
              const { data: existingMember } = await supabase
                .from("perks_members")
                .select("id")
                .eq("client_id", clientId)
                .maybeSingle();
              if (existingMember) {
                await supabase
                  .from("perks_members")
                  .update({ referred_by: referrer.id })
                  .eq("id", existingMember.id);
              }
              // If not yet a member, the referred_by will be set when admin enrolls them in Perks
            }
          }

          const { error: jobErr } = await supabase.from("jobs").insert({
            client_id: clientId,
            service: booking.service,
            scheduled_at: new Date().toISOString(),
            status: "scheduled",
            notes: `From booking. ${booking.bedrooms} bed / ${booking.bathrooms} bath, ${booking.frequency}. ${booking.notes || ""}`.trim(),
          });
          if (jobErr) {
            logger.error("Failed to auto-create job", jobErr);
          } else {
            toast.success("Job created — assign a technician in the Jobs tab.");
          }
        }
      }
    }
  };

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    // Hide confirmed bookings that have been converted to jobs (cleanup)
    if (b.status === "confirmed") return matchesSearch && matchesStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Requests", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-olive-gold" },
          { label: "Confirmed", value: stats.confirmed, color: "text-primary" },
          { label: "Completed", value: stats.completed, color: "text-secondary" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-[0.97] ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {!readOnly && (
            <Button size="sm" onClick={() => setShowAddBooking(true)} className="rounded-lg">
              <Plus className="h-4 w-4 mr-1" /> Add Booking
            </Button>
          )}
        </div>
      </div>

      {/* Add Booking Dialog */}
      <Dialog open={showAddBooking} onOpenChange={setShowAddBooking}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Name *</label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email *</label>
                <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Phone *</label>
                <PhoneInput value={addForm.phone || undefined} onChange={(v) => setAddForm({ ...addForm, phone: v || "" })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Service</label>
                <select value={addForm.service} onChange={(e) => setAddForm({ ...addForm, service: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                  <option value="essential">Essential</option>
                  <option value="general">General</option>
                  <option value="signature-deep">Signature Deep</option>
                  <option value="makeover-deep">Makeover Deep</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Home Type</label>
                <select value={addForm.home_type} onChange={(e) => setAddForm({ ...addForm, home_type: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bedrooms</label>
                <Input type="number" min="1" value={addForm.bedrooms} onChange={(e) => setAddForm({ ...addForm, bedrooms: e.target.value })} className="rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bathrooms</label>
                <Input type="number" min="1" value={addForm.bathrooms} onChange={(e) => setAddForm({ ...addForm, bathrooms: e.target.value })} className="rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Frequency</label>
                <select value={addForm.frequency} onChange={(e) => setAddForm({ ...addForm, frequency: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Address</label>
                <AddressInput
                  value={{
                    address_line1: addForm.address,
                    city: "",
                    state: "",
                    zip: "",
                  }}
                  onChange={(a) => setAddForm({ ...addForm, address: formatAddress(a) })}
                  showLabels={false}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} className="rounded-lg" rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddBooking(false)}>Cancel</Button>
              <Button onClick={handleAddBooking} disabled={addSaving}>
                {addSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Create Booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Booking List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">No booking requests found.</p>
            </div>
          ) : (
            filtered.map((b) => {
              const sc = statusConfig[b.status] || statusConfig.pending;
              const Icon = sc.icon;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className={`w-full text-left bg-card rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.99] ${
                    selected?.id === b.id ? "border-primary shadow-md" : "border-border shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} · {b.frequency}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${sc.className}`}>
                      <Icon className="h-3 w-3" />
                      {sc.label}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(b.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Detail Panel — desktop inline, mobile/tablet drawer */}
        {isDesktop ? (
          <div className="lg:col-span-1">
            {selected ? (
              <BookingDetailContent booking={selected} isAdmin={isAdmin} readOnly={readOnly} statusConfig={statusConfig} updateStatus={updateStatus} />
            ) : (
              <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a booking to view details</p>
              </div>
            )}
          </div>
        ) : (
          <Drawer open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
            <DrawerContent className="max-h-[85vh] overflow-y-auto px-4 pb-6">
              <DrawerHeader className="text-left">
                <DrawerTitle>{selected?.name || "Booking Details"}</DrawerTitle>
                <DrawerDescription>
                  {selected?.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || ""}
                </DrawerDescription>
              </DrawerHeader>
              {selected && (
                <BookingDetailContent booking={selected} isAdmin={isAdmin} readOnly={readOnly} statusConfig={statusConfig} updateStatus={updateStatus} />
              )}
            </DrawerContent>
          </Drawer>
        )}
      </div>
    </div>
  );
}

/* ---------- Detail Content (extracted for reuse in drawer) ---------- */

function BookingDetailContent({
  booking,
  isAdmin,
  readOnly,
  statusConfig,
  updateStatus,
}: {
  booking: BookingRequest;
  isAdmin: boolean;
  readOnly?: boolean;
  statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }>;
  updateStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 sticky top-24 space-y-5 lg:border lg:shadow-sm border-0 shadow-none">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{booking.name}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Submitted {new Date(booking.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4 shrink-0" />
          <a href={`mailto:${booking.email}`} className="hover:text-foreground transition-colors truncate">{booking.email}</a>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4 shrink-0" />
          <a href={`tel:${booking.phone}`} className="hover:text-foreground transition-colors">{booking.phone}</a>
        </div>
        {booking.address && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Home className="h-4 w-4 shrink-0" />
            <span>{booking.address}</span>
          </div>
        )}
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Service</span>
          <span className="font-medium text-foreground">{booking.service.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Home Type</span>
          <span className="font-medium text-foreground">{booking.home_type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Size</span>
          <span className="font-medium text-foreground">{booking.bedrooms} bed / {booking.bathrooms} bath</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frequency</span>
          <span className="font-medium text-foreground">{booking.frequency}</span>
        </div>
      </div>
      {booking.notes && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-foreground">{booking.notes}</p>
        </div>
      )}
      {isAdmin && !readOnly && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">Update Status</p>
          <div className="grid grid-cols-2 gap-2">
            {["pending", "confirmed", "completed", "cancelled"].map((s) => {
              const sc = statusConfig[s];
              return (
                <button
                  key={s}
                  onClick={() => updateStatus(booking.id, s)}
                  disabled={booking.status === s}
                  className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-40 ${sc.className}`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
