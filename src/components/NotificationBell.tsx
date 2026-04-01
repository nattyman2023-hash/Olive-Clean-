import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, ArrowRightLeft, Package, Megaphone, Clock, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  trade_request: { icon: ArrowRightLeft, color: "text-amber-600" },
  trade_accepted: { icon: ArrowRightLeft, color: "text-blue-600" },
  trade_approved: { icon: CheckCircle2, color: "text-emerald-600" },
  trade_denied: { icon: ArrowRightLeft, color: "text-destructive" },
  supply_request: { icon: Package, color: "text-violet-600" },
  schedule_posted: { icon: Clock, color: "text-blue-600" },
  announcement: { icon: Megaphone, color: "text-blue-600" },
  reminder: { icon: Clock, color: "text-amber-600" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications" as any).update({ read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((n: any) => !n.read).map((n: any) => n.id);
      if (unreadIds.length === 0) return;
      await supabase.from("notifications" as any).update({ read: true }).in("id", unreadIds);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors active:scale-95">
          <Bell className="h-4 w-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[0.6rem] font-bold text-white bg-destructive rounded-full px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No notifications yet.</p>
          ) : (
            notifications.map((n: any) => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.announcement;
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
                  onClick={() => {
                    if (!n.read) markReadMutation.mutate(n.id);
                  }}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                    {n.body && <p className="text-[0.65rem] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[0.6rem] text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
