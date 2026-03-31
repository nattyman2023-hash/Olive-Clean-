import { useEffect, useState, useRef, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isClient: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  rolesLoading: true,
  isAdmin: false,
  isStaff: false,
  isClient: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const resolvedUserIdRef = useRef<string | null>(null);

  // Synchronous-only auth listener — no Supabase calls inside
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session?.user) {
        resolvedUserIdRef.current = null;
        setIsAdmin(false);
        setIsStaff(false);
        setIsClient(false);
        setRolesLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Separate effect for role resolution — safe to call supabase.rpc here
  useEffect(() => {
    if (!user) return;
    if (resolvedUserIdRef.current === user.id) {
      setRolesLoading(false);
      return;
    }

    let cancelled = false;
    setRolesLoading(true);

    (async () => {
      try {
        const [adminRes, staffRes, clientRes] = await Promise.all([
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "staff" }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "client" as never }),
        ]);
        if (cancelled) return;
        setIsAdmin(!!adminRes.data);
        setIsStaff(!!staffRes.data);
        setIsClient(!!clientRes.data);
        resolvedUserIdRef.current = user.id;
      } catch {
        // roles stay false on failure
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, rolesLoading, isAdmin, isStaff, isClient, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
