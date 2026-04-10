import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

const ALL_SECTIONS = [
  "bookings", "jobs", "calendar", "routes",
  "leads", "clients", "perks",
  "team", "hiring", "time-off",
  "finance", "analytics", "services", "supplies",
  "emails", "photos", "permissions",
] as const;

const CONFIGURABLE_ROLES = ["staff", "finance"] as const;
type ConfigRole = (typeof CONFIGURABLE_ROLES)[number];

export default function PermissionsManager() {
  const [matrix, setMatrix] = useState<Record<ConfigRole, Set<string>>>({
    staff: new Set(),
    finance: new Set(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, section")
        .in("role", [...CONFIGURABLE_ROLES]);

      if (error) {
        toast.error("Failed to load permissions");
        setLoading(false);
        return;
      }

      const m: Record<ConfigRole, Set<string>> = { staff: new Set(), finance: new Set() };
      for (const row of data ?? []) {
        if (row.role in m) {
          (m as any)[row.role].add(row.section);
        }
      }
      setMatrix(m);
      setLoading(false);
    })();
  }, []);

  const toggle = (role: ConfigRole, section: string) => {
    setMatrix((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      if (next[role].has(section)) next[role].delete(section);
      else next[role].add(section);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Delete existing non-admin permissions
      for (const role of CONFIGURABLE_ROLES) {
        await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role as any);
      }

      // Insert new
      const rows: { role: string; section: string }[] = [];
      for (const role of CONFIGURABLE_ROLES) {
        for (const section of matrix[role]) {
          rows.push({ role, section });
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(rows as any);
        if (error) throw error;
      }

      toast.success("Permissions saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Role Permissions</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure which dashboard sections each role can access. Admins always have full access.
      </p>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Section</TableHead>
              {CONFIGURABLE_ROLES.map((role) => (
                <TableHead key={role} className="text-center capitalize min-w-[100px]">
                  {role}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_SECTIONS.map((section) => (
              <TableRow key={section}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium capitalize">
                  {section.replace("-", " ")}
                </TableCell>
                {CONFIGURABLE_ROLES.map((role) => (
                  <TableCell key={role} className="text-center">
                    <Checkbox
                      checked={matrix[role].has(section)}
                      onCheckedChange={() => toggle(role, section)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Permissions
      </Button>
    </div>
  );
}
