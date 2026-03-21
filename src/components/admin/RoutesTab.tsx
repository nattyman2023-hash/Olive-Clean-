import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Clock, User, Calendar, Shield, Zap, GripVertical, LayoutGrid } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RouteJobCard from "./routes/RouteJobCard";
import RouteTechHeader from "./routes/RouteTechHeader";
import AutoAssignButton from "./dispatch/AutoAssignButton";
import RecurringScheduleButton from "./dispatch/RecurringScheduleButton";
import ConstraintWarning from "./dispatch/ConstraintWarning";

export interface RouteJob {
  id: string;
  client_id: string;
  service: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number | null;
  estimated_drive_minutes: number | null;
  notes: string | null;
  assigned_to: string | null;
  clients: {
    name: string;
    address: string | null;
    neighborhood: string | null;
    preferences: Record<string, unknown> | null;
  } | null;
}

export interface Employee {
  id: string;
  name: string;
  user_id: string;
  certifications: string[] | null;
}

const ZONE_COLORS: Record<string, string> = {
  "Belle Meade": "border-l-amber-500 bg-amber-50",
  "Brentwood": "border-l-emerald-500 bg-emerald-50",
  "Franklin": "border-l-sky-500 bg-sky-50",
  "Green Hills": "border-l-violet-500 bg-violet-50",
  "West Nashville": "border-l-rose-500 bg-rose-50",
};

const DEFAULT_ZONE = "border-l-border bg-card";

type GroupMode = "technician" | "zone";

export default function RoutesTab() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [groupMode, setGroupMode] = useState<GroupMode>("technician");
  const [draggedJob, setDraggedJob] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["route-jobs", selectedDate],
    queryFn: async () => {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;
      const { data, error } = await supabase
        .from("jobs")
        .select("id, client_id, service, status, scheduled_at, duration_minutes, estimated_drive_minutes, notes, assigned_to, clients(name, address, neighborhood, preferences)")
        .gte("scheduled_at", startOfDay)
        .lte("scheduled_at", endOfDay)
        .in("status", ["scheduled", "in_progress"])
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data as unknown) as RouteJob[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, user_id, certifications")
        .eq("status", "active");
      if (error) throw error;
      return (data as unknown) as Employee[];
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; scheduled_at: string }[]) => {
      for (const u of updates) {
        const { error } = await supabase.from("jobs").update({ scheduled_at: u.scheduled_at }).eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-jobs", selectedDate] });
      toast({ title: "Route reordered", description: "Job sequence updated." });
    },
  });

  const employeeMap = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => { map[e.user_id] = e; });
    return map;
  }, [employees]);

  const grouped = useMemo(() => {
    if (groupMode === "zone") {
      const zones: Record<string, RouteJob[]> = { "No Zone": [] };
      jobs.forEach((j) => {
        const zone = j.clients?.neighborhood || "No Zone";
        if (!zones[zone]) zones[zone] = [];
        zones[zone].push(j);
      });
      return Object.fromEntries(Object.entries(zones).filter(([, v]) => v.length > 0));
    }

    const groups: Record<string, RouteJob[]> = { Unassigned: [] };
    employees.forEach((e) => { groups[e.name] = []; });
    jobs.forEach((j) => {
      const emp = j.assigned_to ? employeeMap[j.assigned_to] : null;
      const techName = emp ? emp.name : (j.assigned_to ? "Unknown" : "Unassigned");
      if (!groups[techName]) groups[techName] = [];
      groups[techName].push(j);
    });
    return Object.fromEntries(
      Object.entries(groups).filter(([key, val]) => val.length > 0 || key === "Unassigned")
    );
  }, [jobs, employees, employeeMap, groupMode]);

  const handleDrop = useCallback((targetTechName: string, targetIndex: number) => {
    if (!draggedJob) return;
    const techJobs = grouped[targetTechName];
    if (!techJobs) return;

    const jobIndex = techJobs.findIndex((j) => j.id === draggedJob);
    if (jobIndex === -1) return;

    const reordered = [...techJobs];
    const [moved] = reordered.splice(jobIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Reassign scheduled_at times keeping order, 30-min increments from the first job's time
    const baseTime = new Date(reordered[0].scheduled_at).getTime();
    const updates = reordered.map((j, i) => ({
      id: j.id,
      scheduled_at: new Date(baseTime + i * 30 * 60 * 1000).toISOString(),
    }));

    reorderMutation.mutate(updates);
    setDraggedJob(null);
  }, [draggedJob, grouped, reorderMutation]);

  const totalJobs = jobs.length;
  const totalDriveMin = jobs.reduce((sum, j) => sum + (j.estimated_drive_minutes || 0), 0);
  const totalWorkMin = jobs.reduce((sum, j) => sum + (j.duration_minutes || 0), 0);
  const neighborhoods = [...new Set(jobs.map((j) => j.clients?.neighborhood).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Daily Routes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalJobs} job{totalJobs !== 1 ? "s" : ""} · ~{totalWorkMin}m work · ~{totalDriveMin}m drive
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setGroupMode("technician")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${groupMode === "technician" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            >
              <User className="h-3 w-3 inline mr-1" />Tech
            </button>
            <button
              onClick={() => setGroupMode("zone")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${groupMode === "zone" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3 w-3 inline mr-1" />Zone
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl w-auto"
            />
          </div>
        </div>
      </div>

      {/* Zone legend */}
      {neighborhoods.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {neighborhoods.map((n) => (
            <span
              key={n}
              className={`text-[0.65rem] font-medium px-2.5 py-1 rounded-full border ${
                ZONE_COLORS[n!] ? ZONE_COLORS[n!].split(" ")[1] : "bg-muted"
              } text-foreground`}
            >
              {n}
            </span>
          ))}
        </div>
      )}

      {jobsLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      ) : totalJobs === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No jobs scheduled for this date.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([groupName, groupJobs]) => {
            if (groupJobs.length === 0 && groupName !== "Unassigned") return null;
            const groupDrive = groupJobs.reduce((s, j) => s + (j.estimated_drive_minutes || 0), 0);
            const groupWork = groupJobs.reduce((s, j) => s + (j.duration_minutes || 0), 0);
            const totalTime = groupWork + groupDrive;
            const utilization = totalTime > 0 ? Math.round((groupWork / totalTime) * 100) : 0;

            // Find employee for this group (tech mode only)
            const emp = groupMode === "technician"
              ? employees.find((e) => e.name === groupName)
              : null;

            return (
              <div key={groupName}>
                <RouteTechHeader
                  name={groupName}
                  jobCount={groupJobs.length}
                  workMinutes={groupWork}
                  driveMinutes={groupDrive}
                  utilization={utilization}
                  certifications={emp?.certifications as string[] | null}
                  isZoneMode={groupMode === "zone"}
                />
                <div className="space-y-2">
                  {groupJobs.map((j, i) => (
                    <RouteJobCard
                      key={j.id}
                      job={j}
                      index={i}
                      zoneColors={ZONE_COLORS}
                      defaultZone={DEFAULT_ZONE}
                      onDragStart={() => setDraggedJob(j.id)}
                      onDrop={() => handleDrop(groupName, i)}
                      isDragging={draggedJob === j.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
