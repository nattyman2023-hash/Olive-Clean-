import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Bed, Repeat, MessageCircle, AlertCircle, GripVertical } from "lucide-react";

function scoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

interface Props {
  lead: any;
  lastActivityAt?: string | null;
  onClick: () => void;
  isDragging?: boolean;
}

export default function LeadKanbanCard({ lead, lastActivityAt, onClick, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dndDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  // Stale = new lead with no activity for 48h+
  const lastTs = lastActivityAt ? new Date(lastActivityAt).getTime() : new Date(lead.created_at).getTime();
  const isStale = lead.status === "new" && Date.now() - lastTs > 48 * 60 * 60 * 1000;

  const ghosting = dndDragging || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all ${
        ghosting ? "opacity-40" : "hover:shadow-md hover:-translate-y-0.5"
      } ${isStale ? "ring-2 ring-destructive/40 shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)]" : ""}`}
    >
      {/* Drag handle strip */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 rounded-l-lg cursor-grab active:cursor-grabbing"
        aria-label="Drag lead"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Click area opens drawer */}
      <button
        onClick={onClick}
        className="w-full text-left pl-7 pr-3 py-3 space-y-2"
      >
        {/* Header: name + score */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-foreground line-clamp-1">
            {lead.name || "Unknown lead"}
          </span>
          <Badge variant="outline" className={`shrink-0 text-[0.6rem] font-bold tabular-nums px-1.5 py-0 ${scoreColor(lead.score)}`}>
            {lead.score}
          </Badge>
        </div>

        {/* Body: service / rooms / frequency */}
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.7rem] text-muted-foreground">
          {(lead.bedrooms || lead.bathrooms) && (
            <span className="inline-flex items-center gap-1">
              <Bed className="h-3 w-3" /> {lead.bedrooms || "?"}bd / {lead.bathrooms || "?"}ba
            </span>
          )}
          {lead.frequency && (
            <span className="inline-flex items-center gap-1 capitalize">
              <Repeat className="h-3 w-3" /> {lead.frequency.replace("_", " ")}
            </span>
          )}
          {lead.location && (
            <span className="inline-flex items-center gap-1 line-clamp-1">
              <MapPin className="h-3 w-3" /> {lead.location}
            </span>
          )}
        </div>

        {/* Footer: last activity + source */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
          <span className="text-[0.6rem] text-muted-foreground">
            {isStale && <AlertCircle className="inline h-2.5 w-2.5 text-destructive mr-1" />}
            {formatDistanceToNow(new Date(lastTs), { addSuffix: true })}
          </span>
          <Badge variant="outline" className="text-[0.55rem] px-1 py-0 capitalize">
            {lead.source === "chatbot" && <MessageCircle className="h-2 w-2 mr-0.5" />}
            {lead.source?.replace("_", " ") || "manual"}
          </Badge>
        </div>
      </button>
    </div>
  );
}