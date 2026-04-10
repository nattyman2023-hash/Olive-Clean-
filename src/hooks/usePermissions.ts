import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PermissionEntry {
  section: string;
  can_edit: boolean;
}

interface PermissionsState {
  allowedSections: string[];
  loading: boolean;
  canAccess: (section: string) => boolean;
  canEdit: (section: string) => boolean;
  refetch: () => void;
}

export function usePermissions(): PermissionsState {
  const { user, isAdmin, rolesLoading } = useAuth();
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const resolvedRef = useRef<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    if (isAdmin) {
      const allSections = [
        "bookings", "jobs", "calendar", "routes",
        "leads", "clients", "perks",
        "team", "hiring", "time-off",
        "finance", "analytics", "services", "supplies",
        "emails", "photos", "permissions",
      ];
      setPermissions(allSections.map(s => ({ section: s, can_edit: true })));
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
        .select("section, can_edit");

      if (error) throw error;
      setPermissions((data ?? []).map((r: any) => ({ section: r.section, can_edit: !!r.can_edit })));
      resolvedRef.current = user.id;
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (rolesLoading) return;
    fetchPermissions();
  }, [fetchPermissions, rolesLoading]);

  const allowedSections = permissions.map(p => p.section);

  const canAccess = useCallback(
    (section: string) => isAdmin || permissions.some(p => p.section === section),
    [isAdmin, permissions]
  );

  const canEdit = useCallback(
    (section: string) => isAdmin || permissions.some(p => p.section === section && p.can_edit),
    [isAdmin, permissions]
  );

  return { allowedSections, loading, canAccess, canEdit, refetch: fetchPermissions };
}
