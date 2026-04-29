import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, Clock, Edit3, History } from "lucide-react";

interface AuditEntry {
  id: string;
  created_at: string;
  content: string;
  note_type: string;
  previous?: string;
  next?: string;
  actor?: string;
  reason?: string;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_PILL: Record<string, string> = {
  scheduled: "bg-olive-gold/10 text-olive-gold border-olive-gold/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

/**
 * Parses our standard audit-note format:
 *   "Status: scheduled → completed (by admin@x.com) — Reason: foo"
 */
function parseStatusChange(content: string) {
  const m = content.match(/Status:\s*([a-z_]+)\s*→\s*([a-z_]+)(?:\s*\(by\s*([^)]+)\))?(?:\s*[—-]\s*Reason:\s*(.+))?/i);
  if (!m) return null;
  return { previous: m[1], next: m[2], actor: m[3]?.trim(), reason: m[4]?.trim() };
}

export default function JobAuditLog({ jobId, refreshKey }: { jobId: string; refreshKey?: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("crm_notes")
      .select("id, created_at, content, note_type")
      .eq("parent_type", "job")
      .eq("parent_id", jobId)
      .in("note_type", ["status_change", "job_edit", "system"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows: AuditEntry[] = (data || []).map((r: any) => {
          const parsed = r.note_type === "status_change" ? parseStatusChange(r.content) : null;
          return { ...r, ...(parsed || {}) };
        });
        setEntries(rows);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [jobId, refreshKey]);

  if (loading) {
    return <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No status changes recorded yet.</p>;
  }

  return (
    <ol className="relative border-l border-border/60 ml-1.5 space-y-3">
      {entries.map((e) => {
        const isStatus = e.note_type === "status_change";
        const isEdit = e.note_type === "job_edit";
        const Icon = isStatus ? History : isEdit ? Edit3 : Clock;
        return (
          <li key={e.id} className="ml-3.5 pl-1">
            <span className="absolute -left-[7px] flex items-center justify-center h-3.5 w-3.5 rounded-full bg-card border border-border">
              <Icon className="h-2.5 w-2.5 text-muted-foreground" />
            </span>
            <div className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[0.65rem] uppercase tracking-wide font-semibold text-muted-foreground">
                  {isStatus ? "Status change" : isEdit ? "Job edited" : "System"}
                </p>
                <p className="text-[0.6rem] text-muted-foreground shrink-0">
                  {format(new Date(e.created_at), "MMM d · h:mm a")}
                </p>
              </div>
              {isStatus && e.previous && e.next ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded border ${STATUS_PILL[e.previous] || "bg-muted text-muted-foreground border-border"}`}>
                    {STATUS_LABEL[e.previous] || e.previous}
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground">→</span>
                  <span className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded border ${STATUS_PILL[e.next] || "bg-muted text-muted-foreground border-border"}`}>
                    {STATUS_LABEL[e.next] || e.next}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-foreground whitespace-pre-wrap">{e.content}</p>
              )}
              {(e.actor || e.reason) && (
                <div className="mt-1.5 space-y-0.5">
                  {e.actor && <p className="text-[0.6rem] text-muted-foreground">By {e.actor}</p>}
                  {e.reason && <p className="text-[0.6rem] text-destructive/80 italic">Reason: {e.reason}</p>}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}