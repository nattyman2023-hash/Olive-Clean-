import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Lock } from "lucide-react";

interface ClientRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export default function ClientAccountSettings({ client, onUpdate }: { client: ClientRecord; onUpdate: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone || "");
  const [address, setAddress] = useState(client.address || "");
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ name, phone: phone || null, address: address || null })
        .eq("id", client.id);
      if (error) throw error;
      toast.success("Profile updated");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated");
      // Send security notification
      if (user?.email) {
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "password-changed",
            recipientEmail: user.email,
            idempotencyKey: `pw-changed-${user.id}-${Date.now()}`,
          },
        });
      }
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={user?.email || ""} disabled className="rounded-xl mt-1 text-sm bg-muted" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl mt-1 text-sm" />
          </div>
          <Button onClick={saveProfile} disabled={saving} className="rounded-full text-xs gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">New Password</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="rounded-xl mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Confirm Password</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="rounded-xl mt-1 text-sm" />
          </div>
          <Button onClick={changePassword} disabled={pwSaving || !newPw} variant="outline" className="rounded-full text-xs gap-1">
            {pwSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
