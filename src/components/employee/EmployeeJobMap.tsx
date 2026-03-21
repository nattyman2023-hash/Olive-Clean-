import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapTilerKey } from "@/hooks/useMapTilerKey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";

interface EmployeeMapProps {
  jobs: any[];
}

const NASHVILLE_CENTER: [number, number] = [36.1627, -86.7816];

export default function EmployeeJobMap({ jobs }: EmployeeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { key: mapTilerKey, loading: keyLoading } = useMapTilerKey();

  const jobsWithCoords = jobs.filter(
    (j) => j.clients?.lat != null && j.clients?.lng != null
  );

  useEffect(() => {
    if (!mapRef.current || !mapTilerKey || jobsWithCoords.length === 0) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(NASHVILLE_CENTER, 12);
    mapInstanceRef.current = map;

    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
      {
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>',
        tileSize: 512,
        zoomOffset: -1,
      }
    ).addTo(map);

    // Numbered markers for each job
    jobsWithCoords.forEach((j, idx) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;border-radius:50%;background:hsl(var(--primary));color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)">${idx + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([j.clients.lat, j.clients.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-size:12px;line-height:1.4">
          <p style="font-weight:600;margin:0">${j.clients?.name || "Client"}</p>
          <p style="margin:2px 0">${j.clients?.address || ""}</p>
          <p style="margin:2px 0">${j.service.replace(/-/g, " ")}</p>
        </div>
      `);
    });

    // Connect jobs in sequence
    if (jobsWithCoords.length > 1) {
      const positions = jobsWithCoords.map((j) => [j.clients.lat, j.clients.lng] as [number, number]);
      L.polyline(positions, {
        color: "hsl(221, 83%, 53%)",
        weight: 2,
        dashArray: "6 4",
        opacity: 0.6,
      }).addTo(map);
    }

    // Fit bounds
    const bounds = L.latLngBounds(jobsWithCoords.map((j) => [j.clients.lat, j.clients.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapTilerKey, jobsWithCoords]);

  if (keyLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (jobsWithCoords.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Today's Route
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapRef} className="rounded-b-xl" style={{ height: 280 }} />
      </CardContent>
    </Card>
  );
}
