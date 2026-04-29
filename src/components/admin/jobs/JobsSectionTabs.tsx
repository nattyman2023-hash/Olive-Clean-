import { Briefcase, Clock, CheckCircle2, Archive } from "lucide-react";

export type JobSection = "new" | "scheduled" | "converted" | "archived";

const sections: { key: JobSection; label: string; icon: any }[] = [
  { key: "new", label: "New", icon: Briefcase },
  { key: "scheduled", label: "Scheduled", icon: Clock },
  { key: "converted", label: "Converted", icon: CheckCircle2 },
  { key: "archived", label: "Archived", icon: Archive },
];

export function getSectionForJob(job: { status: string; assigned_to: string | null; created_at: string }): JobSection {
  if (job.status === "cancelled") return "archived";
  if (job.status === "completed") return "converted";
  if (job.status === "in_progress") return "scheduled";
  // status === scheduled
  const ageMs = Date.now() - new Date(job.created_at).getTime();
  if (!job.assigned_to || ageMs < 24 * 60 * 60 * 1000) return "new";
  return "scheduled";
}

export default function JobsSectionTabs({
  active,
  counts,
  onChange,
}: {
  active: JobSection;
  counts: Record<JobSection, number>;
  onChange: (s: JobSection) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4 border-b border-border">
      {sections.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span
              className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
