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

const CONFIGURABLE_ROLES = ["staff", "finance", "admin_assistant"] as const;
type ConfigRole = (typeof CONFIGURABLE_ROLES)[number];

interface CellState { view: boolean; edit: boolean }

export default function PermissionsManager() {
  const [matrix, setMatrix] = useState<Record<ConfigRole, Record<string, CellState>>>({
    staff: {},
    finance: {},
    admin_assistant: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, section, can_edit")
        .in("role", [...CONFIGURABLE_ROLES]);

      if (error) {
        toast.error("Failed to load permissions");
        setLoading(false);
        return;
      }

      const m: Record<ConfigRole, Record<string, CellState>> = { staff: {}, finance: {}, admin_assistant: {} };
      for (const row of data ?? []) {
        if (row.role in m) {
          (m as any)[row.role][row.section] = { view: true, edit: !!(row as any).can_edit };
        }
      }
      setMatrix(m);
      setLoading(false);
    })();
  }, []);

  const getCell = (role: ConfigRole, section: string): CellState =>
    matrix[role][section] ?? { view: false, edit: false };

  const toggleView = (role: ConfigRole, section: string) => {
    setMatrix((prev) => {
      const cell = prev[role][section] ?? { view: false, edit: false };
      const newView = !cell.view;
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [section]: { view: newView, edit: newView ? cell.edit : false },
        },
      };
    });
  };

  const toggleEdit = (role: ConfigRole, section: string) => {
    setMatrix((prev) => {
      const cell = prev[role][section] ?? { view: false, edit: false };
      const newEdit = !cell.edit;
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [section]: { view: newEdit ? true : cell.view, edit: newEdit },
        },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const role of CONFIGURABLE_ROLES) {
        await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role as any);
      }

      const rows: { role: string; section: string; can_edit: boolean }[] = [];
      for (const role of CONFIGURABLE_ROLES) {
        for (const section of ALL_SECTIONS) {
          const cell = getCell(role, section);
          if (cell.view) {
            rows.push({ role, section, can_edit: cell.edit });
          }
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
        Configure which dashboard sections each role can <strong>view</strong> or <strong>edit</strong>. Admins always have full access.
      </p>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Section</TableHead>
              {CONFIGURABLE_ROLES.map((role) => (
                <TableHead key={role} colSpan={2} className="text-center capitalize min-w-[160px]">
                  {role}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10" />
              {CONFIGURABLE_ROLES.map((role) => (
                <>
                  <TableHead key={`${role}-view`} className="text-center text-xs text-muted-foreground">View</TableHead>
                  <TableHead key={`${role}-edit`} className="text-center text-xs text-muted-foreground">Edit</TableHead>
                </>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_SECTIONS.map((section) => (
              <TableRow key={section}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium capitalize">
                  {section.replace("-", " ")}
                </TableCell>
                {CONFIGURABLE_ROLES.map((role) => {
                  const cell = getCell(role, section);
                  return (
                    <>
                      <TableCell key={`${role}-${section}-view`} className="text-center">
                        <Checkbox
                          checked={cell.view}
                          onCheckedChange={() => toggleView(role, section)}
                        />
                      </TableCell>
                      <TableCell key={`${role}-${section}-edit`} className="text-center">
                        <Checkbox
                          checked={cell.edit}
                          onCheckedChange={() => toggleEdit(role, section)}
                        />
                      </TableCell>
                    </>
                  );
                })}
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
