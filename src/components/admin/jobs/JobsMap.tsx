import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapTilerKey } from "@/hooks/useMapTilerKey";
import { Loader2 } from "lucide-react";

const NASHVILLE_CENTER: [number, number] = [36.1627, -86.7816];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#f59e0b",
  in_progress: "#3b82f6",
  completed: "#10b981",
  cancelled: "#ef4444",
};

function createIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

interface JobWithCoords {
  id: string;
  service: string;
  status: string;
  scheduled_at: string;
  clients?: { name: string; neighborhood: string | null; lat: number | null; lng: number | null } | null;
  employees?: { name: string; photo_url: string | null } | null;
}

interface JobsMapProps {
  jobs: JobWithCoords[];
}

export default function JobsMap({ jobs }: JobsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { key: mapTilerKey, loading: keyLoading } = useMapTilerKey();

  const jobsWithCoords = useMemo(
    () => jobs.filter((j) => j.clients?.lat != null && j.clients?.lng != null),
    [jobs]
  );

  useEffect(() => {
    if (!mapRef.current || !mapTilerKey || jobsWithCoords.length === 0) return;

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

    const bounds: [number, number][] = [];

    jobsWithCoords.forEach((j) => {
      const lat = j.clients!.lat!;
      const lng = j.clients!.lng!;
      bounds.push([lat, lng]);
      const color = STATUS_COLORS[j.status] || "#6b7280";
      const marker = L.marker([lat, lng], { icon: createIcon(color) }).addTo(map);
      marker.bindPopup(`
        <div style="font-size:12px;line-height:1.4">
          <p style="font-weight:600;margin:0">${j.clients?.name || ""}</p>
          <p style="margin:2px 0">${j.service.replace(/-/g, " ")}</p>
          <p style="margin:2px 0">${new Date(j.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
          ${j.employees?.name ? `<p style="margin:2px 0;color:#888">Tech: ${j.employees.name}</p>` : ""}
          ${j.clients?.neighborhood ? `<p style="margin:2px 0;color:#888">${j.clients.neighborhood}</p>` : ""}
        </div>
      `);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapTilerKey, jobsWithCoords]);

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
      <div className="bg-card border border-t-0 border-border rounded-b-xl px-4 py-2 flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        ))}
      </div>
    </div>
  );
}
