import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/employee");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for a password reset link.");
    setMode("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary flex items-center justify-center mb-3">
            <span className="text-primary-foreground text-lg font-bold">O</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Team Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Sign in to view your schedule" : "Reset your password"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="rounded-xl" />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full active:scale-[0.97] transition-transform">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sign In
              </Button>
              <button type="button" onClick={() => setMode("forgot")} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="rounded-xl" />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full active:scale-[0.97] transition-transform">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Send Reset Link
              </Button>
              <button type="button" onClick={() => setMode("login")} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground transition-colors">← Back to Olive Clean</Link>
        </p>
      </div>
    </div>
  );
}
