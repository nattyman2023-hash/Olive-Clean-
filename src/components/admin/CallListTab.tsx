import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { Phone, Mail, Loader2, AlertCircle, UserX, Clock, CheckSquare, ArrowRight } from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";

type OutreachStatus = "needs_nudge" | "attempted" | "speaking" | "won_back";

interface OutreachItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  reason: string;
  tag: string;
  parentType: "lead" | "client";
  detail: string;
  outreachStatus: OutreachStatus;
}

const COLUMNS: { key: OutreachStatus; label: string; color: string }[] = [
  { key: "needs_nudge", label: "Needs Nudge", color: "border-destructive/30" },
  { key: "attempted", label: "Attempted", color: "border-amber-400/40" },
  { key: "speaking", label: "Speaking", color: "border-blue-400/40" },
  { key: "won_back", label: "Won Back", color: "border-emerald-400/40" },
];

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

export default function CallListTab() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<OutreachItem | null>(null);
  // Local status overrides for client-type items (no DB column)
  const [clientStatuses, setClientStatuses] = useState<Record<string, OutreachStatus>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["outreach-hub"],
    queryFn: async () => {
      const list: OutreachItem[] = [];
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // 1. Stale leads
      const { data: staleLeads } = await supabase
        .from("leads")
        .select("id, name, email, phone, created_at, outreach_status")
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
          outreachStatus: l.outreach_status || "needs_nudge",
        });
      });

      // 2. Stale quotes
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
          outreachStatus: "needs_nudge",
        });
      });

      // 3. Lost clients
      const fortyFiveDaysAgo = subDays(new Date(), 45).toISOString();
      const { data: allClients } = await supabase
        .from("clients")
        .select("id, name, email, phone, created_at")
        .limit(200);

      if (allClients && allClients.length > 0) {
        const { data: recentJobs } = await supabase
          .from("jobs")
          .select("client_id")
          .eq("status", "completed")
          .gte("completed_at", fortyFiveDaysAgo);
        const activeClientIds = new Set((recentJobs || []).map((j: any) => j.client_id));
        allClients.forEach((c: any) => {
          if (!activeClientIds.has(c.id) && new Date(c.created_at || 0) < new Date(fortyFiveDaysAgo)) {
            list.push({
              id: c.id, name: c.name, email: c.email, phone: c.phone,
              reason: "No completed job in 45+ days",
              tag: "Win-back", parentType: "client",
              detail: "",
              outreachStatus: "needs_nudge",
            });
          }
        });
      }

      // 4. Pending tasks
      const { data: tasks } = await supabase
        .from("crm_notes")
        .select("id, parent_type, parent_id, content, created_at")
        .eq("is_task", true)
        .eq("is_completed", false)
        .order("created_at", { ascending: true })
        .limit(50);

      if (tasks && tasks.length > 0) {
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
            outreachStatus: "needs_nudge",
          });
        });
      }

      return list;
    },
    refetchInterval: 60000,
  });

  const logCall = useMutation({
    mutationFn: async (item: OutreachItem) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("crm_notes").insert({
        parent_type: item.parentType,
        parent_id: item.id,
        author_id: user?.id || null,
        content: "Phone call logged from Outreach Hub",
        note_type: "phone_call",
      });
      // Move lead outreach_status to "attempted"
      if (item.parentType === "lead") {
        await supabase.from("leads").update({ outreach_status: "attempted" } as any).eq("id", item.id);
      }
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ["outreach-hub"] });
      if (item.parentType === "client") {
        setClientStatuses((prev) => ({ ...prev, [item.id]: "attempted" }));
      }
      toast.success("Call logged — moved to Attempted");
    },
  });

  const moveItem = async (item: OutreachItem, newStatus: OutreachStatus) => {
    if (item.parentType === "lead") {
      await supabase.from("leads").update({ outreach_status: newStatus } as any).eq("id", item.id);
      queryClient.invalidateQueries({ queryKey: ["outreach-hub"] });
    } else {
      setClientStatuses((prev) => ({ ...prev, [item.id]: newStatus }));
    }
    toast.success(`Moved to ${COLUMNS.find((c) => c.key === newStatus)?.label}`);
  };

  const getItemStatus = (item: OutreachItem): OutreachStatus => {
    if (item.parentType === "client" && clientStatuses[item.id]) return clientStatuses[item.id];
    return item.outreachStatus;
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Outreach Hub</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {items.length} contact{items.length !== 1 ? "s" : ""} needing follow-up
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const count = items.filter((i) => getItemStatus(i) === col.key).length;
          return (
            <Card key={col.key}>
              <CardContent className="py-3 px-4">
                <p className="text-2xl font-bold text-foreground tabular-nums">{count}</p>
                <p className="text-[0.65rem] text-muted-foreground">{col.label}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colItems = items.filter((i) => getItemStatus(i) === col.key);
            return (
              <div key={col.key} className={`rounded-xl border-2 ${col.color} bg-card p-3 space-y-2 min-h-[200px]`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{col.label}</h3>
                  <Badge variant="secondary" className="text-[0.6rem]">{colItems.length}</Badge>
                </div>
                {colItems.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-6">No contacts</p>
                )}
                {colItems.map((item, idx) => {
                  const Icon = TAG_ICONS[item.tag] || AlertCircle;
                  return (
                    <Card key={`${item.id}-${idx}`} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelectedItem(item)}>
                      <CardContent className="py-2.5 px-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-xs text-foreground truncate flex-1">{item.name}</p>
                          <Badge variant="secondary" className={`text-[0.55rem] shrink-0 ${TAG_STYLES[item.tag] || ""}`}>
                            <Icon className="h-2 w-2 mr-0.5" /> {item.tag}
                          </Badge>
                        </div>
                        <p className="text-[0.6rem] text-muted-foreground line-clamp-2">{item.reason}</p>
                        <div className="flex gap-2 mt-1.5">
                          <Button size="sm" variant="outline" className="text-[0.6rem] h-5 px-1.5 gap-0.5" onClick={(e) => { e.stopPropagation(); logCall.mutate(item); }}>
                            <Phone className="h-2.5 w-2.5" /> Call
                          </Button>
                          {item.email && (
                            <Button size="sm" variant="outline" className="text-[0.6rem] h-5 px-1.5 gap-0.5" asChild onClick={(e) => e.stopPropagation()}>
                              <a href={`mailto:${item.email}`}><Mail className="h-2.5 w-2.5" /> Email</a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(o) => { if (!o) setSelectedItem(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{selectedItem?.name || "Contact Details"}</SheetTitle>
          </SheetHeader>
          {selectedItem && (
            <div className="space-y-4 mt-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                <div><p className="text-[0.65rem] text-muted-foreground">Email</p><p className="text-foreground text-xs">{selectedItem.email || "—"}</p></div>
                <div><p className="text-[0.65rem] text-muted-foreground">Phone</p><p className="text-foreground text-xs">{selectedItem.phone || "—"}</p></div>
                <div><p className="text-[0.65rem] text-muted-foreground">Reason</p><p className="text-foreground text-xs">{selectedItem.reason}</p></div>
                <div><p className="text-[0.65rem] text-muted-foreground">Tag</p><Badge variant="secondary" className={`${TAG_STYLES[selectedItem.tag] || ""} text-[0.6rem]`}>{selectedItem.tag}</Badge></div>
              </div>

              {/* Move Actions */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Move to column</p>
                <div className="flex flex-wrap gap-2">
                  {COLUMNS.filter((c) => c.key !== getItemStatus(selectedItem)).map((col) => (
                    <Button key={col.key} size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { moveItem(selectedItem, col.key); setSelectedItem(null); }}>
                      <ArrowRight className="h-3 w-3" /> {col.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => logCall.mutate(selectedItem)}>
                  <Phone className="h-3 w-3" /> Log Call
                </Button>
                {selectedItem.email && (
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" asChild>
                    <a href={`mailto:${selectedItem.email}`}><Mail className="h-3 w-3" /> Email</a>
                  </Button>
                )}
              </div>

              {/* Activity Timeline */}
              <ActivityTimeline parentType={selectedItem.parentType} parentId={selectedItem.id} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
