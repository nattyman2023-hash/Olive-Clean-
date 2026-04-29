import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlayCircle, CheckCircle2, XCircle, RotateCcw, Undo2, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Props {
  status: string;
  onTransition: (next: string, reason?: string) => void | Promise<void>;
  /** Optional: if provided, render the lifecycle stepper above the action matrix */
  assignedTo?: string | null;
  createdAt?: string;
}

/**
 * Status transition matrix:
 *   scheduled -> in_progress, cancelled
 *   in_progress -> completed, cancelled
 *   completed -> in_progress (reopen)
 *   cancelled -> scheduled (restore)
 */
export default function JobStatusActions({ status, onTransition, assignedTo, createdAt }: Props) {
  const [confirm, setConfirm] = useState<null | { next: string; needsReason: boolean; title: string; desc: string }>(null);
  const [reason, setReason] = useState("");

  const ask = (next: string, needsReason: boolean, title: string, desc: string) => {
    setReason("");
    setConfirm({ next, needsReason, title, desc });
  };

  const allowed: { key: string; label: string; icon: any; variant?: any; needsReason?: boolean; confirmTitle: string; confirmDesc: string }[] = [];
  if (status === "scheduled") {
    allowed.push({ key: "in_progress", label: "Start", icon: PlayCircle, confirmTitle: "Start this job?", confirmDesc: "The cleaning technician will be marked as on-site." });
    allowed.push({ key: "cancelled", label: "Cancel", icon: XCircle, variant: "destructive", needsReason: true, confirmTitle: "Cancel this job?", confirmDesc: "Please provide a reason. The client will be notified." });
  } else if (status === "in_progress") {
    allowed.push({ key: "completed", label: "Complete", icon: CheckCircle2, confirmTitle: "Mark job complete?", confirmDesc: "An invoice draft will be created and feedback request scheduled." });
    allowed.push({ key: "cancelled", label: "Cancel", icon: XCircle, variant: "destructive", needsReason: true, confirmTitle: "Cancel this job?", confirmDesc: "Please provide a reason. The client will be notified." });
  } else if (status === "completed") {
    allowed.push({ key: "in_progress", label: "Reopen", icon: RotateCcw, confirmTitle: "Reopen completed job?", confirmDesc: "Status will revert to In Progress. Existing invoice and feedback will remain." });
  } else if (status === "cancelled") {
    allowed.push({ key: "scheduled", label: "Restore", icon: Undo2, confirmTitle: "Restore cancelled job?", confirmDesc: "The job will return to Scheduled status." });
  }

  // ---- Lifecycle stepper logic (New → Scheduled → Completed) ----
  const showStepper = createdAt !== undefined; // only render when caller opts in
  const ageMs = createdAt ? Date.now() - new Date(createdAt).getTime() : 0;
  const isFresh = ageMs < 24 * 60 * 60 * 1000;
  let stage: "new" | "scheduled" | "completed" | "cancelled" = "new";
  if (status === "completed") stage = "completed";
  else if (status === "cancelled") stage = "cancelled";
  else if (status === "in_progress") stage = "scheduled";
  else if (!assignedTo || isFresh) stage = "new";
  else stage = "scheduled";

  const stepClass = (s: "new" | "scheduled" | "completed", current: typeof stage) => {
    const order = { new: 0, scheduled: 1, completed: 2, cancelled: 3 } as const;
    const cur = order[current];
    const me = order[s];
    if (current === "cancelled") return "bg-muted text-muted-foreground border-border";
    if (me < cur) return "bg-primary/15 text-primary border-primary/30";
    if (me === cur) return "bg-primary text-primary-foreground border-primary shadow-sm";
    return "bg-card text-muted-foreground border-border";
  };

  const handleStepClick = (target: "new" | "scheduled" | "completed") => {
    if (stage === "cancelled") return;
    if (target === "scheduled") {
      if (!assignedTo) {
        toast.info("Assign a cleaning technician first to move this job to Scheduled.");
        return;
      }
      if (status === "scheduled" && isFresh) {
        toast.success("Job acknowledged — it will appear under Scheduled.");
      }
      return;
    }
    if (target === "completed") {
      if (status === "completed") return;
      if (status === "scheduled" || status === "in_progress") {
        ask("completed", false, "Mark job complete?", "An invoice draft will be created and feedback request scheduled.");
      }
      return;
    }
    // target === "new" — going backward is intentionally not supported via the stepper
  };

  return (
    <>
      {showStepper && (
        <div className="mb-4">
          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-2">
            Lifecycle: <span className="font-semibold text-foreground capitalize">{stage === "cancelled" ? "Cancelled" : stage}</span>
          </p>
          <div className="flex items-center gap-1.5">
            {([
              { key: "new", label: "New" },
              { key: "scheduled", label: "Scheduled" },
              { key: "completed", label: "Completed" },
            ] as const).map((step, idx, arr) => {
              const order = { new: 0, scheduled: 1, completed: 2, cancelled: 3 } as const;
              const isPast = order[step.key] < order[stage];
              return (
                <div key={step.key} className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => handleStepClick(step.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] ${stepClass(step.key, stage)}`}
                  >
                    {isPast && <Check className="h-3 w-3" />}
                    {step.label}
                  </button>
                  {idx < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                </div>
              );
            })}
          </div>
          {stage === "new" && !assignedTo && (
            <p className="text-[0.65rem] text-muted-foreground mt-1.5 italic">Assign a cleaning technician to move this job to Scheduled.</p>
          )}
          {stage === "cancelled" && (
            <p className="text-[0.65rem] text-destructive mt-1.5 italic">Job is cancelled — use Restore below to bring it back.</p>
          )}
          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mt-3 mb-1">Advanced actions</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {allowed.map(({ key, label, icon: Icon, variant, needsReason, confirmTitle, confirmDesc }) => (
          <Button
            key={key}
            size="sm"
            variant={variant || "outline"}
            className="rounded-lg gap-1.5"
            onClick={() => ask(key, !!needsReason, confirmTitle, confirmDesc)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.needsReason && (
            <Textarea
              placeholder="Reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-lg"
              rows={3}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirm?.needsReason && !reason.trim()}
              onClick={async () => {
                if (!confirm) return;
                await onTransition(confirm.next, confirm.needsReason ? reason.trim() : undefined);
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
