import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ARCHIVE_REASONS } from "./leadStageConfig";
import { Archive } from "lucide-react";

interface Props {
  open: boolean;
  leadName?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function ArchiveReasonDialog({ open, leadName, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<string>("");
  const [other, setOther] = useState("");

  const handleConfirm = () => {
    const reason = selected === "Other" ? other.trim() || "Other" : selected;
    if (!reason) return;
    onConfirm(reason);
    setSelected("");
    setOther("");
  };

  const handleCancel = () => {
    setSelected("");
    setOther("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Archive className="h-4 w-4" /> Archive {leadName || "Lead"}?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick a loss reason — we'll log it to the activity timeline for your funnel analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {ARCHIVE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
                selected === r
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-primary/40 hover:bg-muted/50 text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {selected === "Other" && (
          <Textarea
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Tell us more..."
            rows={2}
            className="text-sm"
          />
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selected || (selected === "Other" && !other.trim())}>
            Archive Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}