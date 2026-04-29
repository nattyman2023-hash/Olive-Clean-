import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import LeadKanbanCard from "./LeadKanbanCard";
import ArchiveReasonDialog from "./ArchiveReasonDialog";
import { STAGES, leadToStage, type StageId } from "./leadStageConfig";

interface Props {
  leads: any[];
  onSelectLead: (lead: any) => void;
  onConvertLead: (lead: any) => void;
  onCreateQuote: (lead: any) => void;
  search: string;
}

export default function LeadsKanban({ leads, onSelectLead, onConvertLead, onCreateQuote, search }: Props) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<StageId, boolean>>({
    new: false, contacted: false, quoted: false, outreach: false,
    converted: true, archived: true,
  });
  const [showArchived, setShowArchived] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<any | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Fetch most recent crm_note per parent_id (lead) for "last activity" footer + stale detection
  const { data: lastActivityMap = {} } = useQuery({
    queryKey: ["leads-last-activity", leads.map(l => l.id).join(",")],
    enabled: leads.length > 0,
    queryFn: async () => {
      const ids = leads.map(l => l.id);
      const { data, error } = await supabase
        .from("crm_notes")
        .select("parent_id, created_at")
        .eq("parent_type", "lead")
        .in("parent_id", ids)
        .order("created_at", { ascending: false });
      if (error) return {};
      const map: Record<string, string> = {};
      for (const row of data || []) {
        if (!map[row.parent_id]) map[row.parent_id] = row.created_at;
      }
      return map;
    },
  });

  // Optimistic status update
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, outreach_status }: { id: string; status: string; outreach_status?: string | null }) => {
      const updates: any = { status };
      if (outreach_status !== undefined) updates.outreach_status = outreach_status;
      const { error } = await supabase.from("leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-leads"] });
      const previous = queryClient.getQueryData<any[]>(["admin-leads"]);
      queryClient.setQueryData<any[]>(["admin-leads"], (old) =>
        old?.map((l) => (l.id === id ? { ...l, status } : l)) ?? []
      );
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["admin-leads"], ctx.previous);
      toast.error("Update failed: " + (e as Error).message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    },
  });

  const archiveLead = useMutation({
    mutationFn: async ({ lead, reason }: { lead: any; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Log loss reason as a system note
      await supabase.from("crm_notes").insert({
        parent_type: "lead",
        parent_id: lead.id,
        author_id: user?.id || null,
        content: `Lead archived — ${reason}`,
        note_type: "system",
      });
      const { error } = await supabase
        .from("leads")
        .update({ status: "archived" } as any)
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-notes"] });
      toast.success("Lead archived");
    },
    onError: (e) => toast.error("Archive failed: " + (e as Error).message),
  });

  // Apply search filter
  const visibleLeads = useMemo(() => {
    if (!search) return leads;
    const s = search.toLowerCase();
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.location].some((v) => v?.toLowerCase().includes(s))
    );
  }, [leads, search]);

  // Group by stage
  const grouped = useMemo(() => {
    const map: Record<StageId, any[]> = {
      new: [], contacted: [], quoted: [], outreach: [], converted: [], archived: [],
    };
    for (const lead of visibleLeads) {
      const stage = leadToStage(lead);
      if (stage) map[stage].push(lead);
    }
    return map;
  }, [visibleLeads]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const lead = (active.data.current as any)?.lead;
    const targetStageId = String(over.id) as StageId;
    const targetStage = STAGES.find((s) => s.id === targetStageId);
    if (!lead || !targetStage) return;

    const currentStage = leadToStage(lead);
    if (currentStage === targetStageId) return;

    // Special drop targets
    if (targetStageId === "archived") {
      setPendingArchive(lead);
      return;
    }
    if (targetStageId === "converted") {
      onConvertLead(lead);
      return;
    }
    if (targetStageId === "quoted" && currentStage !== "quoted") {
      // Update status to quoted AND open the quote prefill flow
      updateStatus.mutate({ id: lead.id, status: "quoted" });
      onCreateQuote(lead);
      return;
    }
    if (targetStageId === "outreach") {
      updateStatus.mutate({ id: lead.id, status: "follow_up", outreach_status: "needs_nudge" });
      return;
    }

    // Standard column → just update status
    updateStatus.mutate({ id: lead.id, status: targetStage.status });
  }

  return (
    <>
      {/* Archived toggle */}
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs gap-1.5"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showArchived ? "Hide" : "Show"} archived ({grouped.archived.length})
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
          {STAGES.filter((s) => s.id !== "archived" || showArchived).map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={grouped[stage.id]}
              collapsed={collapsed[stage.id]}
              onToggleCollapse={() =>
                setCollapsed((c) => ({ ...c, [stage.id]: !c[stage.id] }))
              }
              onSelectLead={onSelectLead}
              lastActivityMap={lastActivityMap}
              activeId={activeId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="rotate-2 cursor-grabbing">
              <LeadKanbanCard
                lead={activeLead}
                lastActivityAt={lastActivityMap[activeLead.id]}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <ArchiveReasonDialog
        open={!!pendingArchive}
        leadName={pendingArchive?.name}
        onConfirm={(reason) => {
          if (pendingArchive) archiveLead.mutate({ lead: pendingArchive, reason });
          setPendingArchive(null);
        }}
        onCancel={() => setPendingArchive(null)}
      />
    </>
  );
}

/* ---------------------- Column ---------------------- */

interface ColumnProps {
  stage: typeof STAGES[number];
  leads: any[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectLead: (lead: any) => void;
  lastActivityMap: Record<string, string>;
  activeId: string | null;
}

function KanbanColumn({ stage, leads, collapsed, onToggleCollapse, onSelectLead, lastActivityMap, activeId }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const Icon = stage.icon;

  const isSpecialDrop = stage.id === "archived" || stage.id === "converted" || stage.id === "quoted";

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl bg-muted/30 border border-border/60 transition-colors ${
        isOver ? "bg-primary/10 border-primary/40 ring-2 ring-primary/30" : ""
      }`}
    >
      {/* Column header */}
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 hover:bg-muted/50 transition-colors rounded-t-xl text-left w-full"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2 w-2 rounded-full ${stage.accent}`} />
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-xs text-foreground truncate">{stage.label}</span>
                <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0 tabular-nums">
                  {leads.length}
                </Badge>
              </div>
              {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            {stage.description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Cards */}
      {!collapsed && (
        <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-260px)] overflow-y-auto">
          {leads.length === 0 ? (
            <div className="text-center py-6 px-2">
              <p className="text-[0.65rem] text-muted-foreground/70 italic">
                {isOver ? "Drop here" : isSpecialDrop ? `Drag a lead here to ${stage.id === "archived" ? "archive" : stage.id === "converted" ? "convert" : "quote"}` : "Empty"}
              </p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadKanbanCard
                key={lead.id}
                lead={lead}
                lastActivityAt={lastActivityMap[lead.id]}
                onClick={() => onSelectLead(lead)}
                isDragging={activeId === lead.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}