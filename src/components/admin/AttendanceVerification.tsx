import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMapTilerKey } from "@/hooks/useMapTilerKey";
import { haversineDistance } from "@/lib/geo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef } from "react";

interface AttendanceVerificationProps {
  jobId: string;
  jobLat?: number | null;
  jobLng?: number | null;
  expectedDuration?: number | null;
}

export default function AttendanceVerification({ jobId, jobLat, jobLng, expectedDuration }: AttendanceVerificationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { key: mapTilerKey } = useMapTilerKey();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["job_time_logs", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_time_logs" as any)
        .select("*")
        .eq("job_id", jobId)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const clockIn = logs.find((l: any) => l.action_type === "clock_in");
  const clockOut = logs.find((l: any) => l.action_type === "clock_out");

  // Build map when logs + key available
  useEffect(() => {
    if (!mapRef.current || !mapTilerKey || !clockIn) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: false }).setView(
      [clockIn.latitude || 0, clockIn.longitude || 0],
      14
    );
    mapInstanceRef.current = map;

    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
      { attribution: "", tileSize: 512, zoomOffset: -1 }
    ).addTo(map);

    // Clock-in pin (blue)
    if (clockIn.latitude && clockIn.longitude) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([clockIn.latitude, clockIn.longitude], { icon }).addTo(map).bindPopup("Clock-in location");
    }

    // Job site pin (green)
    if (jobLat && jobLng) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([jobLat, jobLng], { icon }).addTo(map).bindPopup("Job site");
    }

    // Fit bounds
    const points: [number, number][] = [];
    if (clockIn.latitude && clockIn.longitude) points.push([clockIn.latitude, clockIn.longitude]);
    if (jobLat && jobLng) points.push([jobLat, jobLng]);
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapTilerKey, clockIn, jobLat, jobLng]);

  if (isLoading) {
    return (
      <div className="border-t border-border pt-4">
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (logs.length === 0) return null;

  const actualMinutes = clockIn && clockOut
    ? Math.round((new Date(clockOut.recorded_at).getTime() - new Date(clockIn.recorded_at).getTime()) / 60000)
    : null;

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-primary" />
        Attendance & Verification
      </p>

      {/* Timestamps */}
      <div className="space-y-1.5">
        {clockIn && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Clock In</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{format(new Date(clockIn.recorded_at), "h:mm a")}</span>
              {clockIn.is_verified_location ? (
                <Badge variant="secondary" className="text-[0.55rem] gap-0.5 bg-emerald-100 text-emerald-800 border-0">
                  <CheckCircle2 className="h-2.5 w-2.5" />On-site
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[0.55rem] gap-0.5 bg-amber-100 text-amber-800 border-0">
                  <AlertTriangle className="h-2.5 w-2.5" />Flagged
                </Badge>
              )}
            </div>
          </div>
        )}
        {clockOut && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Clock Out</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{format(new Date(clockOut.recorded_at), "h:mm a")}</span>
              {clockOut.is_verified_location ? (
                <Badge variant="secondary" className="text-[0.55rem] gap-0.5 bg-emerald-100 text-emerald-800 border-0">
                  <CheckCircle2 className="h-2.5 w-2.5" />On-site
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[0.55rem] gap-0.5 bg-amber-100 text-amber-800 border-0">
                  <AlertTriangle className="h-2.5 w-2.5" />Flagged
                </Badge>
              )}
            </div>
          </div>
        )}
        {clockIn && clockIn.distance_from_site != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Distance from site</span>
            <span className="font-medium text-foreground">{Math.round(clockIn.distance_from_site)}m</span>
          </div>
        )}
      </div>

      {/* Duration comparison */}
      {actualMinutes != null && (
        <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Verified Duration</span>
            <span className="font-bold text-foreground">{Math.floor(actualMinutes / 60)}h {actualMinutes % 60}m</span>
          </div>
          {expectedDuration && (
            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">Expected</span>
              <span className="text-foreground">{Math.floor(expectedDuration / 60)}h {expectedDuration % 60}m</span>
            </div>
          )}
        </div>
      )}

      {/* Mini map */}
      {clockIn?.latitude && (
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Clock-in
            </div>
            <div className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" /> Job site
            </div>
          </div>
          <div ref={mapRef} className="rounded-lg border border-border" style={{ height: 160 }} />
        </div>
      )}
    </div>
  );
}
