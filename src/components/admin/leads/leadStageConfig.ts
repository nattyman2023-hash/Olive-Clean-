import { Sparkles, PhoneCall, FileText, BellRing, CheckCircle2, Archive } from "lucide-react";

export type StageId = "new" | "contacted" | "quoted" | "outreach" | "converted" | "archived";

export interface StageConfig {
  id: StageId;
  label: string;
  description: string;
  status: string; // value written to leads.status when dropped here
  icon: typeof Sparkles;
  accent: string; // tailwind color class for column header bar
  collapsedByDefault?: boolean;
  hiddenByDefault?: boolean;
}

export const STAGES: StageConfig[] = [
  { id: "new", label: "New", description: "Fresh leads awaiting first touch", status: "new", icon: Sparkles, accent: "bg-blue-500" },
  { id: "contacted", label: "Contacted", description: "Reached out — awaiting reply", status: "contacted", icon: PhoneCall, accent: "bg-violet-500" },
  { id: "quoted", label: "Quoted", description: "Quote sent, watching for response", status: "quoted", icon: FileText, accent: "bg-amber-500" },
  { id: "outreach", label: "Outreach", description: "Needs nudge / boomerang", status: "follow_up", icon: BellRing, accent: "bg-orange-500" },
  { id: "converted", label: "Converted", description: "Booked — moved to Jobs", status: "converted", icon: CheckCircle2, accent: "bg-emerald-500", collapsedByDefault: true },
  { id: "archived", label: "Archived", description: "Dead / lost leads", status: "archived", icon: Archive, accent: "bg-muted-foreground", hiddenByDefault: true },
];

/** Map a lead row to its kanban column. */
export function leadToStage(lead: any): StageId | null {
  const status: string = lead?.status || "new";
  if (status === "scheduled") return null; // hidden — lives in Jobs
  if (status === "new") return "new";
  if (status === "contacted") return "contacted";
  if (status === "quoted") return "quoted";
  if (status === "follow_up" || status === "outreach" || lead?.outreach_status === "boomerang") return "outreach";
  if (status === "converted") return "converted";
  if (status === "archived") return "archived";
  return "new";
}

export const ARCHIVE_REASONS = [
  "Price too high",
  "No response",
  "Out of service area",
  "Chose competitor",
  "Not ready yet",
  "Other",
] as const;