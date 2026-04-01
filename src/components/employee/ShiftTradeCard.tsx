import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRightLeft, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ShiftTradeCardProps {
  trade: any;
  currentEmployeeId: string;
  employees: { id: string; name: string; user_id: string }[];
}

export default function ShiftTradeCard({ trade, currentEmployeeId, employees }: ShiftTradeCardProps) {
  const queryClient = useQueryClient();
  const isRequester = trade.requester_id === currentEmployeeId;
  const requester = employees.find(e => e.id === trade.requester_id);
  const target = trade.target_id ? employees.find(e => e.id === trade.target_id) : null;

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("shift_trade_requests" as any)
        .update({ target_id: currentEmployeeId, status: "pending_admin", updated_at: new Date().toISOString() })
        .eq("id", trade.id);
      if (error) throw error;

      // Notify admin users
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin" as any);
      if (adminRoles) {
        const notifications = adminRoles.map((r: any) => ({
          user_id: r.user_id,
          type: "trade_accepted",
          title: "Shift trade needs your approval",
          body: `${requester?.name || "A team member"} wants to swap a shift.`,
        }));
        await supabase.from("notifications" as any).insert(notifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift_trades"] });
      toast.success("Trade accepted — waiting for admin approval");
    },
    onError: () => toast.error("Failed to accept trade"),
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("shift_trade_requests" as any)
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", trade.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift_trades"] });
      toast.success("Trade declined");
    },
  });

  const statusBadge: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    accepted: "bg-blue-100 text-blue-800",
    pending_admin: "bg-violet-100 text-violet-800",
    approved: "bg-emerald-100 text-emerald-800",
    denied: "bg-red-100 text-red-800",
    cancelled: "bg-muted text-muted-foreground",
  };

  const canAccept = !isRequester && trade.status === "open";
  const canDecline = (isRequester && trade.status === "open") || (!isRequester && trade.status === "open");

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-foreground">
              {isRequester ? "Your trade request" : `Trade from ${requester?.name || "Unknown"}`}
            </span>
          </div>
          <span className={`text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge[trade.status] || ""}`}>
            {trade.status.replace(/_/g, " ")}
          </span>
        </div>
        <p className="text-[0.65rem] text-muted-foreground">
          Job on {trade.requester_job?.scheduled_at ? format(new Date(trade.requester_job.scheduled_at), "MMM d, h:mm a") : "N/A"}
        </p>
        {(canAccept || canDecline) && (
          <div className="flex gap-2 pt-1">
            {canAccept && (
              <Button size="sm" className="flex-1 rounded-lg text-xs h-7" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
                {acceptMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}Accept
              </Button>
            )}
            {canDecline && (
              <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs h-7" onClick={() => declineMutation.mutate()} disabled={declineMutation.isPending}>
                <X className="h-3 w-3 mr-1" />{isRequester ? "Cancel" : "Decline"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
