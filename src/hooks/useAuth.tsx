import { useEffect, useState, useRef, createContext, useContext, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  isFinance: boolean;
  isAdminAssistant: boolean;
  isCleaner: boolean;
  signOut: () => Promise<void>;
  // Impersonation
  impersonatedUserId: string | null;
  impersonatedRole: string | null;
  impersonatedName: string | null;
  isImpersonating: boolean;
  startImpersonation: (userId: string, role: string, name: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  rolesLoading: true,
  isAdmin: false,
  isStaff: false,
  isClient: false,
  isFinance: false,
  isAdminAssistant: false,
  isCleaner: false,
  signOut: async () => {},
  impersonatedUserId: null,
  impersonatedRole: null,
  impersonatedName: null,
  isImpersonating: false,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isFinance, setIsFinance] = useState(false);
  const [isAdminAssistant, setIsAdminAssistant] = useState(false);
  const [isCleaner, setIsCleaner] = useState(false);
  const resolvedUserIdRef = useRef<string | null>(null);

  // Impersonation state
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<string | null>(null);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);

  const startImpersonation = useCallback((userId: string, role: string, name: string) => {
    setImpersonatedUserId(userId);
    setImpersonatedRole(role);
    setImpersonatedName(name);
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUserId(null);
    setImpersonatedRole(null);
    setImpersonatedName(null);
  }, []);

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
        setIsFinance(false);
        setIsAdminAssistant(false);
        setRolesLoading(false);
        // Clear impersonation on logout
        setImpersonatedUserId(null);
        setImpersonatedRole(null);
        setImpersonatedName(null);
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
      const [adminRes, staffRes, clientRes, financeRes, assistantRes, cleanerRes] = await Promise.all([
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "staff" as any }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "client" as any }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "finance" as any }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin_assistant" as any }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "cleaner" as any }),
        ]);
        if (cancelled) return;
        setIsAdmin(!!adminRes.data);
        setIsStaff(!!staffRes.data);
        setIsClient(!!clientRes.data);
        setIsFinance(!!financeRes.data);
        setIsAdminAssistant(!!assistantRes.data);
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
    setImpersonatedUserId(null);
    setImpersonatedRole(null);
    setImpersonatedName(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, rolesLoading, isAdmin, isStaff, isClient, isFinance, isAdminAssistant, signOut,
      impersonatedUserId, impersonatedRole, impersonatedName,
      isImpersonating: !!impersonatedUserId,
      startImpersonation, stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
