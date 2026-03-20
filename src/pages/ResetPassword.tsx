import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event which fires when the
    // recovery token in the URL hash is exchanged for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      }
    );

    // Also check if there's already a session (user may have landed here
    // after the event already fired).
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If there's a recovery hash in the URL, Supabase JS will handle
      // the token exchange automatically — we just wait for the event.
      // If there's already a session and no hash, the user navigated here
      // directly — show an error.
      const hash = window.location.hash;
      if (session && !hash.includes("type=recovery")) {
        // Already logged in but not via recovery link
        setReady(true);
      } else if (!hash.includes("type=recovery") && !hash.includes("access_token")) {
        setError("No recovery link detected. Please request a new password reset from the login page.");
      }
    });

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      setReady((prev) => {
        if (!prev) {
          setError("The recovery link may have expired. Please request a new password reset.");
        }
        return prev;
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated successfully!");

    // Redirect based on role
    const { data: isClient } = await supabase.rpc("has_role", {
      _user_id: (await supabase.auth.getUser()).data.user!.id,
      _role: "client" as never,
    });
    navigate(isClient ? "/client" : "/admin");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Reset Link Problem</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/admin/login")} className="rounded-full">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Verifying recovery link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a new password for your account.</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-xl" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="rounded-xl" placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full bg-primary hover:bg-primary/90 active:scale-[0.97] transition-transform">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
