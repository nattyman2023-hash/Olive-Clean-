import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export default function SetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-user-password", {
        body: { user_id: userId, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Password updated for ${userName}.`);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Set Password
          </DialogTitle>
          <DialogDescription>
            Set a custom password for <span className="font-medium">{userName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">New Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="rounded-lg mt-1"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Confirm Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="rounded-lg mt-1"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full rounded-lg active:scale-[0.97]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <KeyRound className="h-4 w-4 mr-1" />}
            Set Password
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
