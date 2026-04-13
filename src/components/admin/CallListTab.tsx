import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { Phone, Mail, Loader2, AlertCircle, UserX, Clock, CheckSquare } from "lucide-react";

interface CallItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  reason: string;
  tag: string;
  parentType: "lead" | "client";
  detail: string;
}

export default function CallListTab() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["call-list"],
    queryFn: async () => {
      const list: CallItem[] = [];
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // 1. Stale leads: new, created > 2 hours ago
      const { data: staleLeads } = await supabase
        .from("leads")
        .select("id, name, email, phone, created_at")
        .eq("status", "new")
        .lt("created_at", twoHoursAgo)
        .order("created_at", { ascending: true })
        .limit(50);

      (staleLeads || []).forEach((l: any) => {
        list.push({
          id: l.id, name: l.name || l.email || "Unknown", email: l.email, phone: l.phone,
          reason: `New lead, no response for ${formatDistanceToNow(new Date(l.created_at))}`,
          tag: "Stale Lead", parentType: "lead",
          detail: format(new Date(l.created_at), "MMM d"),
        });
      });

      // 2. Stale quotes: sent > 7 days ago, not accepted
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data: staleQuotes } = await supabase
        .from("estimates")
        .select("id, estimate_number, sent_at, client_id, clients!estimates_client_id_fkey(id, name, email, phone)")
        .eq("status", "sent")
        .lt("sent_at", sevenDaysAgo)
        .order("sent_at", { ascending: true })
        .limit(50);

      (staleQuotes || []).forEach((q: any) => {
        const c = q.clients;
        if (!c) return;
        list.push({
          id: c.id, name: c.name, email: c.email, phone: c.phone,
          reason: `Quote ${q.estimate_number} sent ${formatDistanceToNow(new Date(q.sent_at))} ago, no response`,
          tag: "Stale Quote", parentType: "client",
          detail: q.estimate_number,
        });
      });

      // 3. Lost clients: no job completed in 45+ days
      const fortyFiveDaysAgo = subDays(new Date(), 45).toISOString();
      const { data: allClients } = await supabase
        .from("clients")
        .select("id, name, email, phone")
        .limit(200);

      if (allClients && allClients.length > 0) {
        const { data: recentJobs } = await supabase
          .from("jobs")
          .select("client_id")
          .eq("status", "completed")
          .gte("completed_at", fortyFiveDaysAgo);
        const activeClientIds = new Set((recentJobs || []).map((j: any) => j.client_id));
        // Also exclude clients created in last 45 days (they're new)
        allClients.forEach((c: any) => {
          if (!activeClientIds.has(c.id) && new Date(c.created_at || 0) < new Date(fortyFiveDaysAgo)) {
            list.push({
              id: c.id, name: c.name, email: c.email, phone: c.phone,
              reason: "No completed job in 45+ days",
              tag: "Win-back", parentType: "client",
              detail: "",
            });
          }
        });
      }

      // 4. Pending tasks from crm_notes
      const { data: tasks } = await supabase
        .from("crm_notes")
        .select("id, parent_type, parent_id, content, created_at")
        .eq("is_task", true)
        .eq("is_completed", false)
        .order("created_at", { ascending: true })
        .limit(50);

      if (tasks && tasks.length > 0) {
        // Get names for parent_ids
        const leadIds = tasks.filter((t: any) => t.parent_type === "lead").map((t: any) => t.parent_id);
        const clientIds = tasks.filter((t: any) => t.parent_type === "client").map((t: any) => t.parent_id);
        const [leadNames, clientNames] = await Promise.all([
          leadIds.length > 0 ? supabase.from("leads").select("id, name, email, phone").in("id", leadIds) : { data: [] },
          clientIds.length > 0 ? supabase.from("clients").select("id, name, email, phone").in("id", clientIds) : { data: [] },
        ]);
        const nameMap = new Map<string, any>();
        (leadNames.data || []).forEach((l: any) => nameMap.set(l.id, l));
        (clientNames.data || []).forEach((c: any) => nameMap.set(c.id, c));

        tasks.forEach((t: any) => {
          const parent = nameMap.get(t.parent_id);
          list.push({
            id: t.parent_id, name: parent?.name || parent?.email || "Unknown",
            email: parent?.email || null, phone: parent?.phone || null,
            reason: t.content.substring(0, 80), tag: "Follow-up Task",
            parentType: t.parent_type, detail: format(new Date(t.created_at), "MMM d"),
          });
        });
      }

      return list;
    },
    refetchInterval: 60000,
  });

  const logCall = useMutation({
    mutationFn: async (item: CallItem) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("crm_notes").insert({
        parent_type: item.parentType,
        parent_id: item.id,
        author_id: user?.id || null,
        content: "Phone call logged from Call List",
        note_type: "phone_call",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-list"] });
      toast.success("Call logged");
    },
  });

  const TAG_STYLES: Record<string, string> = {
    "Stale Lead": "bg-destructive/10 text-destructive",
    "Stale Quote": "bg-amber-100 text-amber-800",
    "Win-back": "bg-purple-100 text-purple-800",
    "Follow-up Task": "bg-blue-100 text-blue-800",
  };

  const TAG_ICONS: Record<string, React.ElementType> = {
    "Stale Lead": AlertCircle,
    "Stale Quote": Clock,
    "Win-back": UserX,
    "Follow-up Task": CheckSquare,
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Priority Call List</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {items.length} contact{items.length !== 1 ? "s" : ""} needing follow-up
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["Stale Lead", "Stale Quote", "Win-back", "Follow-up Task"].map((tag) => {
          const count = items.filter((i) => i.tag === tag).length;
          const Icon = TAG_ICONS[tag];
          return (
            <Card key={tag}>
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{count}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{tag}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">All caught up! No follow-ups needed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const Icon = TAG_ICONS[item.tag] || AlertCircle;
            return (
              <Card key={`${item.id}-${idx}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{item.name}</p>
                        <Badge variant="secondary" className={`text-[0.6rem] ${TAG_STYLES[item.tag] || ""}`}>
                          <Icon className="h-2.5 w-2.5 mr-0.5" /> {item.tag}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                      <div className="flex gap-3 text-[0.65rem] text-muted-foreground">
                        {item.phone && <span className="inline-flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> {item.phone}</span>}
                        {item.email && <span className="inline-flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /> {item.email}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => logCall.mutate(item)}>
                        <Phone className="h-3 w-3" /> Log Call
                      </Button>
                      {item.email && (
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" asChild>
                          <a href={`mailto:${item.email}`}><Mail className="h-3 w-3" /> Email</a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
