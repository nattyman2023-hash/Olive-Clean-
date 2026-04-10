import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Shield, Plus, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ALL_SECTIONS = [
  "bookings", "jobs", "calendar", "routes",
  "leads", "clients", "perks",
  "team", "hiring", "time-off",
  "finance", "analytics", "services", "supplies",
  "emails", "photos", "permissions",
] as const;

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
}

interface CellState { view: boolean; edit: boolean }

export default function PermissionsManager() {
  const queryClient = useQueryClient();
  const [matrix, setMatrix] = useState<Record<string, Record<string, CellState>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Fetch custom roles
  const { data: roles = [], isLoading: rolesLoading, refetch: refetchRoles } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("id, name, description")
        .order("created_at");
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  // Fetch permissions after roles load
  useEffect(() => {
    if (rolesLoading || roles.length === 0) return;
    (async () => {
      const roleNames = roles.map(r => r.name);
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, section, can_edit")
        .in("role", roleNames as any);

      if (error) {
        toast.error("Failed to load permissions");
        setLoading(false);
        return;
      }

      const m: Record<string, Record<string, CellState>> = {};
      for (const role of roles) m[role.name] = {};
      for (const row of data ?? []) {
        if (row.role in m) {
          m[row.role][row.section] = { view: true, edit: !!(row as any).can_edit };
        }
      }
      setMatrix(m);
      setLoading(false);
    })();
  }, [roles, rolesLoading]);

  const getCell = (role: string, section: string): CellState =>
    matrix[role]?.[section] ?? { view: false, edit: false };

  const toggleView = (role: string, section: string) => {
    setMatrix((prev) => {
      const cell = prev[role]?.[section] ?? { view: false, edit: false };
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

  const toggleEdit = (role: string, section: string) => {
    setMatrix((prev) => {
      const cell = prev[role]?.[section] ?? { view: false, edit: false };
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
      const roleNames = roles.map(r => r.name);
      for (const role of roleNames) {
        await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role as any);
      }

      const rows: { role: string; section: string; can_edit: boolean }[] = [];
      for (const role of roleNames) {
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

  const createRole = async () => {
    const name = newRoleName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { toast.error("Role name is required"); return; }
    const { error } = await supabase
      .from("custom_roles")
      .insert({ name, description: newRoleDesc.trim() || null } as any);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Role already exists" : error.message);
      return;
    }
    toast.success(`Role "${name}" created`);
    setNewRoleName("");
    setNewRoleDesc("");
    setCreateOpen(false);
    setMatrix(prev => ({ ...prev, [name]: {} }));
    refetchRoles();
  };

  const deleteRole = async (role: CustomRole) => {
    // Delete permissions for this role
    await supabase.from("role_permissions").delete().eq("role", role.name as any);
    // Delete user_roles entries
    await supabase.from("user_roles").delete().eq("role", role.name as any);
    // Delete the custom role
    const { error } = await supabase.from("custom_roles").delete().eq("id", role.id as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Role "${role.name}" deleted`);
    setMatrix(prev => {
      const next = { ...prev };
      delete next[role.name];
      return next;
    });
    refetchRoles();
  };

  if (loading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Role Permissions</h2>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> New Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Role Name</Label>
                <Input
                  placeholder="e.g. dispatcher"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Will be lowercased, spaces become underscores</p>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Brief description of this role"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={createRole}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure which dashboard sections each role can <strong>view</strong> or <strong>edit</strong>. Admins always have full access.
      </p>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Section</TableHead>
              {roles.map((role) => (
                <TableHead key={role.name} colSpan={2} className="text-center min-w-[160px]">
                  <div className="flex items-center justify-center gap-1">
                    <span className="capitalize">{role.name.replace(/_/g, " ")}</span>
                    <button
                      onClick={() => handlePreviewRole(role.name)}
                      className="text-muted-foreground hover:text-primary ml-1"
                      title={`Preview as ${role.name}`}
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground hover:text-destructive ml-1">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete role "{role.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove all permissions and unassign this role from all users. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRole(role)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10" />
              {roles.map((role) => (
                <React.Fragment key={`${role.name}-sub`}>
                  <TableHead className="text-center text-xs text-muted-foreground">View</TableHead>
                  <TableHead className="text-center text-xs text-muted-foreground">Edit</TableHead>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_SECTIONS.map((section) => (
              <TableRow key={section}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium capitalize">
                  {section.replace("-", " ")}
                </TableCell>
                {roles.map((role) => {
                  const cell = getCell(role.name, section);
                  return (
                    <React.Fragment key={`${role.name}-${section}`}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={cell.view}
                          onCheckedChange={() => toggleView(role.name, section)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={cell.edit}
                          onCheckedChange={() => toggleEdit(role.name, section)}
                        />
                      </TableCell>
                    </React.Fragment>
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
