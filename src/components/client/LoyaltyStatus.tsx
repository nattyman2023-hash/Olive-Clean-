import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Gift, Copy, Users } from "lucide-react";
import { toast } from "sonner";

interface LoyaltyStatusProps {
  clientId: string;
}

export default function LoyaltyStatus({ clientId }: LoyaltyStatusProps) {
  const { data: membership } = useQuery({
    queryKey: ["loyalty_membership", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perks_members")
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["loyalty_milestones_client", membership?.id],
    enabled: !!membership,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_milestones")
        .select("*")
        .eq("member_id", membership!.id)
        .order("triggered_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: program } = useQuery({
    queryKey: ["loyalty_program", membership?.program_type],
    enabled: !!membership,
    queryFn: async () => {
      const PROGRAM_KEY_MAP: Record<string, string> = {
        loyalty_club: "Loyalty Club",
        friends_family: "Friends & Family",
        veterans: "Veterans",
        retired: "Retired",
      };
      const programName = PROGRAM_KEY_MAP[membership!.program_type] || membership!.program_type;
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("name", programName)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (!membership) return null;

  const interval = program?.benefits?.free_cleaning_interval || 10;
  const progress = (membership.cleanings_completed / interval) * 100;
  const available = membership.free_cleanings_earned - membership.free_cleanings_used;
  const unredeemed = milestones.filter((m: any) => !m.redeemed);

  const PROGRAM_LABELS: Record<string, string> = {
    loyalty_club: "Loyalty Club",
    friends_family: "Friends & Family",
    veterans: "Veterans",
    retired: "Retired",
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">My Loyalty Status</h2>
      </div>

      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{PROGRAM_LABELS[membership.program_type] || membership.program_type}</p>
              <p className="text-xs text-muted-foreground">{membership.discount_percent}% member discount</p>
            </div>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">Active</span>
          </div>

          {/* Progress to next free cleaning */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress to free cleaning</span>
              <span className="font-medium text-foreground tabular-nums">{membership.cleanings_completed} / {interval}</span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            {available > 0 && (
              <p className="text-xs font-medium text-primary">🎉 You have {available} free cleaning{available > 1 ? "s" : ""} available!</p>
            )}
          </div>

          {/* Referral Code */}
          {membership.referral_code && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Your referral code</p>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <code className="text-xs font-mono text-foreground flex-1">{membership.referral_code}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(membership.referral_code); toast.success("Referral code copied!"); }}
                  className="text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Rewards */}
          {unredeemed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Gift className="h-3 w-3" /> Available rewards</p>
              {unredeemed.map((ms: any) => (
                <div key={ms.id} className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-foreground">{ms.milestone_type.replace(/_/g, " ")}</p>
                  <span className="text-[0.6rem] font-medium text-olive-gold bg-olive-gold/10 px-2 py-0.5 rounded-full">Available</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
