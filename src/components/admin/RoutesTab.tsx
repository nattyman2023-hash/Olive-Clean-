import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Clock, User, Calendar } from "lucide-react";

interface RouteJob {
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
  } | null;
}

interface Employee {
  id: string;
  name: string;
  user_id: string;
}

const ZONE_COLORS: Record<string, string> = {
  "Belle Meade": "border-l-amber-500 bg-amber-50",
  "Brentwood": "border-l-emerald-500 bg-emerald-50",
  "Franklin": "border-l-sky-500 bg-sky-50",
  "Green Hills": "border-l-violet-500 bg-violet-50",
  "West Nashville": "border-l-rose-500 bg-rose-50",
};

const DEFAULT_ZONE = "border-l-border bg-card";

export default function RoutesTab() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["route-jobs", selectedDate],
    queryFn: async () => {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;
      const { data, error } = await supabase
        .from("jobs")
        .select("id, client_id, service, status, scheduled_at, duration_minutes, estimated_drive_minutes, notes, assigned_to, clients(name, address, neighborhood)")
        .gte("scheduled_at", startOfDay)
        .lte("scheduled_at", endOfDay)
        .in("status", ["scheduled", "in_progress"])
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as RouteJob[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, user_id")
        .eq("status", "active");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((e) => { map[e.user_id] = e.name; });
    return map;
  }, [employees]);

  const grouped = useMemo(() => {
    const groups: Record<string, RouteJob[]> = { Unassigned: [] };
    employees.forEach((e) => { groups[e.name] = []; });

    jobs.forEach((j) => {
      const techName = j.assigned_to ? (employeeMap[j.assigned_to] || "Unknown") : "Unassigned";
      if (!groups[techName]) groups[techName] = [];
      groups[techName].push(j);
    });

    // Remove empty groups except Unassigned
    return Object.fromEntries(
      Object.entries(groups).filter(([key, val]) => val.length > 0 || key === "Unassigned")
    );
  }, [jobs, employees, employeeMap]);

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
            {totalJobs} job{totalJobs !== 1 ? "s" : ""} · ~{totalWorkMin} min work · ~{totalDriveMin} min drive
          </p>
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
          {Object.entries(grouped).map(([techName, techJobs]) => {
            if (techJobs.length === 0 && techName !== "Unassigned") return null;
            const techDrive = techJobs.reduce((s, j) => s + (j.estimated_drive_minutes || 0), 0);
            const techWork = techJobs.reduce((s, j) => s + (j.duration_minutes || 0), 0);

            return (
              <div key={techName}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm text-foreground">{techName}</h3>
                  <span className="text-xs text-muted-foreground">
                    {techJobs.length} job{techJobs.length !== 1 ? "s" : ""} · {techWork}m work · {techDrive}m drive
                  </span>
                </div>
                <div className="space-y-2">
                  {techJobs.map((j, i) => {
                    const zone = j.clients?.neighborhood || "";
                    const zoneStyle = ZONE_COLORS[zone] || DEFAULT_ZONE;
                    return (
                      <div
                        key={j.id}
                        className={`border-l-4 rounded-xl border border-border p-4 shadow-sm ${zoneStyle}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                                {i + 1}.
                              </span>
                              <p className="font-semibold text-foreground text-sm truncate">
                                {j.clients?.name || "Unknown"}
                              </p>
                            </div>
                            {j.clients?.address && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {j.clients.address}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium text-foreground tabular-nums">
                              {new Date(j.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </p>
                            <p className="text-[0.65rem] text-muted-foreground">
                              {j.service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {j.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {j.duration_minutes}m
                            </span>
                          )}
                          {j.estimated_drive_minutes && (
                            <span className="flex items-center gap-1">
                              🚗 {j.estimated_drive_minutes}m drive
                            </span>
                          )}
                          {zone && (
                            <span className="font-medium">{zone}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
