import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from "date-fns";

interface CalendarJob {
  id: string;
  service: string;
  status: string;
  scheduled_at: string;
  assigned_to: string | null;
  client_name?: string;
  duration_minutes: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-200 text-blue-900",
  accepted: "bg-blue-200 text-blue-900",
  on_route: "bg-amber-200 text-amber-900",
  on_site: "bg-violet-200 text-violet-900",
  complete: "bg-emerald-200 text-emerald-900",
  completed: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-muted text-muted-foreground",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [employees, setEmployees] = useState<{ user_id: string; name: string }[]>([]);
  const [timeOff, setTimeOff] = useState<any[]>([]);
  const [techFilter, setTechFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    Promise.all([
      supabase
        .from("jobs")
        .select("id, service, status, scheduled_at, assigned_to, duration_minutes, clients(name)")
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString())
        .order("scheduled_at"),
      supabase.from("employees").select("user_id, name").eq("status", "active"),
      supabase
        .from("time_off_requests")
        .select("*, employees(name)")
        .eq("status", "approved")
        .lte("start_date", format(end, "yyyy-MM-dd"))
        .gte("end_date", format(start, "yyyy-MM-dd")),
    ]).then(([jobsRes, empRes, toRes]) => {
      setJobs(
        (jobsRes.data || []).map((j: any) => ({
          ...j,
          client_name: j.clients?.name,
        }))
      );
      setEmployees(empRes.data || []);
      setTimeOff(toRes.data || []);
      setLoading(false);
    });
  }, [currentMonth]);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);

  const filteredJobs = useMemo(() => {
    if (techFilter === "all") return jobs;
    return jobs.filter((j) => j.assigned_to === techFilter);
  }, [jobs, techFilter]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, CalendarJob[]>();
    filteredJobs.forEach((j) => {
      const key = format(new Date(j.scheduled_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j);
    });
    return map;
  }, [filteredJobs]);

  const selectedDayJobs = selectedDay ? (jobsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []) : [];

  const firstDayOffset = getDay(startOfMonth(currentMonth));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy")}</h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg">
            <SelectValue placeholder="All Technicians" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.user_id} value={e.user_id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
          {/* Weekday headers */}
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-muted text-center text-[0.65rem] font-medium text-muted-foreground py-2">{d}</div>
          ))}

          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card min-h-[80px]" />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayJobs = jobsByDay.get(key) || [];
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            // Check if any employee has time off this day
            const dayTimeOff = timeOff.filter((to) => {
              const start = new Date(to.start_date);
              const end = new Date(to.end_date);
              return day >= start && day <= end;
            });

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className={`bg-card min-h-[80px] p-1.5 text-left transition-colors hover:bg-muted/50 ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
              >
                <span className={`text-[0.65rem] font-medium block mb-1 ${isToday ? "bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                {dayJobs.slice(0, 3).map((j) => (
                  <div key={j.id} className={`text-[0.5rem] px-1 py-0.5 rounded mb-0.5 truncate ${STATUS_COLORS[j.status] || "bg-muted"}`}>
                    {j.client_name || j.service}
                  </div>
                ))}
                {dayJobs.length > 3 && (
                  <span className="text-[0.5rem] text-muted-foreground">+{dayJobs.length - 3} more</span>
                )}
                {dayTimeOff.length > 0 && (
                  <div className="text-[0.5rem] px-1 py-0.5 rounded bg-red-100 text-red-700 truncate">
                    🏖 {dayTimeOff.map((t: any) => t.employees?.name).join(", ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{format(selectedDay, "EEEE, MMMM d, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs scheduled.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayJobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{j.client_name || "Client"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(j.scheduled_at), "h:mm a")} · {j.service}
                        {j.duration_minutes ? ` · ${j.duration_minutes} min` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-[0.6rem] ${STATUS_COLORS[j.status] || ""}`}>
                      {j.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
