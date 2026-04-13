import { MapPin, Clock, GripVertical, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RouteJob } from "../RoutesTab";

interface RouteJobCardProps {
  job: RouteJob;
  index: number;
  zoneColors: Record<string, string>;
  defaultZone: string;
  onDragStart: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onSelect?: () => void;
}

export default function RouteJobCard({ job, index, zoneColors, defaultZone, onDragStart, onDrop, onDragEnd, isDragging, onSelect }: RouteJobCardProps) {
  const zone = job.clients?.neighborhood || "";
  const zoneStyle = zoneColors[zone] || defaultZone;
  const isPriority = !!(job.clients?.preferences as Record<string, unknown>)?.priority;
  let isDrag = false;

  return (
    <div
      draggable
      data-job-id={job.id}
      onMouseDown={() => { isDrag = false; }}
      onMouseMove={() => { isDrag = true; }}
      onClick={() => { if (!isDrag && onSelect) onSelect(); }}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; isDrag = true; onDragStart(); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      className={`border-l-4 rounded-xl border border-border p-4 shadow-sm transition-all ${zoneStyle} ${isDragging ? "opacity-40 scale-[0.97]" : "hover:shadow-md"} cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <span className="text-xs font-bold text-muted-foreground tabular-nums">{index + 1}.</span>
          <p className="font-semibold text-foreground text-sm truncate">
            {job.clients?.name || "Unknown"}
          </p>
          {isPriority && (
            <Badge variant="destructive" className="text-[0.6rem] px-1.5 py-0 h-4">
              <Zap className="h-2.5 w-2.5 mr-0.5" />Priority
            </Badge>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-foreground tabular-nums">
            {new Date(job.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <p className="text-[0.65rem] text-muted-foreground">
            {job.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        </div>
      </div>
      {job.clients?.address && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 ml-6">
          <MapPin className="h-3 w-3 shrink-0" />
          {job.clients.address}
        </p>
      )}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground ml-6">
        {job.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {job.duration_minutes}m
          </span>
        )}
        {job.estimated_drive_minutes && (
          <span className="flex items-center gap-1">🚗 {job.estimated_drive_minutes}m drive</span>
        )}
        {zone && <span className="font-medium">{zone}</span>}
      </div>
    </div>
  );
}
