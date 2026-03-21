import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteJob, Employee } from "../RoutesTab";

const NASHVILLE_CENTER: [number, number] = [36.1627, -86.7816];

const ZONE_MARKER_COLORS: Record<string, string> = {
  "Belle Meade": "#f59e0b",
  "Brentwood": "#10b981",
  "Franklin": "#0ea5e9",
  "Green Hills": "#8b5cf6",
  "West Nashville": "#f43f5e",
};

const TECH_LINE_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6"];

function createIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

interface RouteMapProps {
  jobs: RouteJob[];
  employees: Employee[];
  employeeMap: Record<string, Employee>;
}

export default function RouteMap({ jobs, employees, employeeMap }: RouteMapProps) {
  const jobsWithCoords = useMemo(
    () => jobs.filter((j) => j.clients?.lat != null && j.clients?.lng != null),
    [jobs]
  );

  const techLines = useMemo(() => {
    const grouped: Record<string, RouteJob[]> = {};
    jobsWithCoords.forEach((j) => {
      const key = j.assigned_to || "unassigned";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(j);
    });

    return Object.entries(grouped)
      .filter(([, jobs]) => jobs.length > 1)
      .map(([techId, techJobs], idx) => ({
        techId,
        name: techId !== "unassigned" ? (employeeMap[techId]?.name || "Unknown") : "Unassigned",
        color: TECH_LINE_COLORS[idx % TECH_LINE_COLORS.length],
        positions: techJobs.map((j) => [j.clients!.lat!, j.clients!.lng!] as [number, number]),
      }));
  }, [jobsWithCoords, employeeMap]);

  if (jobsWithCoords.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No jobs with location data to display on map.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm" style={{ height: 420 }}>
      <MapContainer center={NASHVILLE_CENTER} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {jobsWithCoords.map((j) => {
          const zone = j.clients?.neighborhood || "";
          const color = ZONE_MARKER_COLORS[zone] || "#6b7280";
          const emp = j.assigned_to ? employeeMap[j.assigned_to] : null;
          return (
            <Marker key={j.id} position={[j.clients!.lat!, j.clients!.lng!]} icon={createIcon(color)}>
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-semibold">{j.clients?.name}</p>
                  <p>{j.service.replace(/-/g, " ")}</p>
                  <p>{new Date(j.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                  {emp && <p className="text-muted-foreground">Tech: {emp.name}</p>}
                  {zone && <p className="text-muted-foreground">{zone}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
        {techLines.map((line) => (
          <Polyline
            key={line.techId}
            positions={line.positions}
            pathOptions={{ color: line.color, weight: 2, dashArray: "6 4", opacity: 0.7 }}
          />
        ))}
      </MapContainer>
      {/* Legend */}
      <div className="bg-card border-t border-border px-4 py-2 flex flex-wrap gap-3">
        {Object.entries(ZONE_MARKER_COLORS).map(([zone, color]) => (
          <span key={zone} className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            {zone}
          </span>
        ))}
        {techLines.map((line) => (
          <span key={line.techId} className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
            <span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: line.color }} />
            {line.name}
          </span>
        ))}
      </div>
    </div>
  );
}
