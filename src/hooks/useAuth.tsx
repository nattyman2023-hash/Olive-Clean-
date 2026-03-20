import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isClient: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isClient: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const checkRoles = async (userId: string) => {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const roleCheck = Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "client" as never }),
      ]);
      const [adminRes, clientRes] = (await Promise.race([roleCheck, timeout])) as any;
      setIsAdmin(!!adminRes.data);
      setIsClient(!!clientRes.data);
    } catch {
      // On timeout/error, preserve existing role state
    }
  };

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          if (_event === 'SIGNED_IN' || !initialized) {
            await checkRoles(session.user.id);
          }
        } else {
          setIsAdmin(false);
          setIsClient(false);
        }
        initialized = true;
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkRoles(session.user.id).then(() => setLoading(false));
        } else {
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isClient, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
