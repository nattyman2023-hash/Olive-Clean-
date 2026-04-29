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
import { PlayCircle, CheckCircle2, XCircle, RotateCcw, Undo2 } from "lucide-react";

interface Props {
  status: string;
  onTransition: (next: string, reason?: string) => void | Promise<void>;
  /** Kept for backwards compatibility; no longer used for stepper rendering. */
  assignedTo?: string | null;
  createdAt?: string;
}

/**
 * Context-aware status actions. The drawer audit log already shows lifecycle
 * history, so this component focuses purely on the next valid transitions:
 *   scheduled -> in_progress, cancelled
 *   in_progress -> completed, cancelled
 *   completed -> in_progress (reopen)
 *   cancelled -> scheduled (restore)
 */
export default function JobStatusActions({ status, onTransition }: Props) {
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

  return (
    <>
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
