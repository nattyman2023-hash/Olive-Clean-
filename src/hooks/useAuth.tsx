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

  const checkRoles = async (userId: string, attempt = 0) => {
    try {
      const [adminRes, staffRes, clientRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "staff" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "client" as never }),
      ]);
      setIsAdmin(!!adminRes.data);
      setIsStaff(!!staffRes.data);
      setIsClient(!!clientRes.data);
      resolvedUserIdRef.current = userId;
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500));
        return checkRoles(userId, attempt + 1);
      }
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Only re-check roles on SIGNED_IN or initial load, skip TOKEN_REFRESHED if same user
          if (_event === 'SIGNED_IN' || !initialized) {
            setRolesLoading(true);
            await checkRoles(session.user.id);
          } else if (_event === 'TOKEN_REFRESHED' && resolvedUserIdRef.current === session.user.id) {
            // Same user, skip role re-check — no flickering
          } else if (resolvedUserIdRef.current !== session.user.id) {
            // Different user (edge case), re-check
            setRolesLoading(true);
            await checkRoles(session.user.id);
          }
        } else {
          setIsAdmin(false);
          setIsStaff(false);
          setIsClient(false);
          resolvedUserIdRef.current = null;
          setRolesLoading(false);
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
          setRolesLoading(true);
          checkRoles(session.user.id).then(() => setLoading(false));
        } else {
          setRolesLoading(false);
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
    <AuthContext.Provider value={{ user, session, loading, rolesLoading, isAdmin, isStaff, isClient, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
