import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapTilerKey } from "@/hooks/useMapTilerKey";
import { Loader2 } from "lucide-react";
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { key: mapTilerKey, loading: keyLoading } = useMapTilerKey();

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

  useEffect(() => {
    if (!mapRef.current || !mapTilerKey || jobsWithCoords.length === 0) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(NASHVILLE_CENTER, 11);
    mapInstanceRef.current = map;

    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
      {
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>',
        tileSize: 512,
        zoomOffset: -1,
      }
    ).addTo(map);

    // Add markers
    jobsWithCoords.forEach((j) => {
      const zone = j.clients?.neighborhood || "";
      const color = ZONE_MARKER_COLORS[zone] || "#6b7280";
      const emp = j.assigned_to ? employeeMap[j.assigned_to] : null;

      const marker = L.marker([j.clients!.lat!, j.clients!.lng!], { icon: createIcon(color) }).addTo(map);
      marker.bindPopup(`
        <div style="font-size:12px;line-height:1.4">
          <p style="font-weight:600;margin:0">${j.clients?.name || ""}</p>
          <p style="margin:2px 0">${j.service.replace(/-/g, " ")}</p>
          <p style="margin:2px 0">${new Date(j.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
          ${emp ? `<p style="margin:2px 0;color:#888">Tech: ${emp.name}</p>` : ""}
          ${zone ? `<p style="margin:2px 0;color:#888">${zone}</p>` : ""}
        </div>
      `);
    });

    // Add polylines
    techLines.forEach((line) => {
      L.polyline(line.positions, {
        color: line.color,
        weight: 2,
        dashArray: "6 4",
        opacity: 0.7,
      }).addTo(map);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapTilerKey, jobsWithCoords, techLines, employeeMap]);

  if (keyLoading) {
    return (
      <div className="h-[420px] bg-card rounded-xl border border-border flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (jobsWithCoords.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No jobs with location data to display on map.</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={mapRef} className="rounded-xl overflow-hidden border border-border shadow-sm" style={{ height: 420 }} />
      {/* Legend */}
      <div className="bg-card border border-t-0 border-border rounded-b-xl px-4 py-2 flex flex-wrap gap-3">
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
