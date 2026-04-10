import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PermissionsState {
  allowedSections: string[];
  loading: boolean;
  canAccess: (section: string) => boolean;
  refetch: () => void;
}

export function usePermissions(): PermissionsState {
  const { user, isAdmin, rolesLoading } = useAuth();
  const [allowedSections, setAllowedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const resolvedRef = useRef<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setAllowedSections([]);
      setLoading(false);
      return;
    }

    // Admin bypasses — they see everything
    if (isAdmin) {
      setAllowedSections([
        "bookings", "jobs", "calendar", "routes",
        "leads", "clients", "perks",
        "team", "hiring", "time-off",
        "finance", "analytics", "services", "supplies",
        "emails", "photos", "permissions",
      ]);
      setLoading(false);
      resolvedRef.current = user.id;
      return;
    }

    if (resolvedRef.current === user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("section");

      if (error) throw error;
      const sections = (data ?? []).map((r) => r.section);
      setAllowedSections(sections);
      resolvedRef.current = user.id;
    } catch {
      setAllowedSections([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (rolesLoading) return;
    fetchPermissions();
  }, [fetchPermissions, rolesLoading]);

  const canAccess = useCallback(
    (section: string) => isAdmin || allowedSections.includes(section),
    [isAdmin, allowedSections]
  );

  return { allowedSections, loading, canAccess, refetch: fetchPermissions };
}
