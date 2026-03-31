import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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

export default function BookingsTab() {
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<BookingRequest | null>(null);

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

  const inviteClient = async (booking: BookingRequest) => {
    try {
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: { email: booking.email, name: booking.name, address: booking.address },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Account setup email sent to ${booking.email}`);
    } catch (err: any) {
      console.error("Invite error:", err);
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
        }).catch((err) => console.error("Booking confirmation email failed:", err));
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
            console.error("Failed to auto-create job:", jobErr);
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
        </div>
      </div>

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

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 sticky top-24 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submitted {new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${selected.email}`} className="hover:text-foreground transition-colors truncate">{selected.email}</a>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${selected.phone}`} className="hover:text-foreground transition-colors">{selected.phone}</a>
                </div>
                {selected.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Home className="h-4 w-4 shrink-0" />
                    <span>{selected.address}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium text-foreground">{selected.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Home Type</span>
                  <span className="font-medium text-foreground">{selected.home_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium text-foreground">{selected.bedrooms} bed / {selected.bathrooms} bath</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="font-medium text-foreground">{selected.frequency}</span>
                </div>
              </div>
              {selected.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              )}
              {isAdmin && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["pending", "confirmed", "completed", "cancelled"].map((s) => {
                      const sc = statusConfig[s];
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(selected.id, s)}
                          disabled={selected.status === s}
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
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a booking to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
