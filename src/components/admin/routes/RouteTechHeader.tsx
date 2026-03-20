import { User, MapPin, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RouteTechHeaderProps {
  name: string;
  jobCount: number;
  workMinutes: number;
  driveMinutes: number;
  utilization: number;
  certifications: string[] | null;
  isZoneMode: boolean;
}

export default function RouteTechHeader({ name, jobCount, workMinutes, driveMinutes, utilization, certifications, isZoneMode }: RouteTechHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {isZoneMode ? (
        <MapPin className="h-4 w-4 text-muted-foreground" />
      ) : (
        <User className="h-4 w-4 text-muted-foreground" />
      )}
      <h3 className="font-semibold text-sm text-foreground">{name}</h3>
      <span className="text-xs text-muted-foreground">
        {jobCount} job{jobCount !== 1 ? "s" : ""} · {workMinutes}m work · {driveMinutes}m drive
      </span>
      {!isZoneMode && utilization > 0 && (
        <Badge variant={utilization >= 70 ? "default" : "secondary"} className="text-[0.6rem] px-1.5 py-0 h-4">
          {utilization}% util
        </Badge>
      )}
      {certifications && certifications.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {certifications.map((cert) => (
            <Badge key={cert} variant="outline" className="text-[0.6rem] px-1.5 py-0 h-4">
              <Shield className="h-2.5 w-2.5 mr-0.5" />{cert}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
