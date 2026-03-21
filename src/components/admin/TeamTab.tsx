import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, User, BarChart3, ClipboardCheck, Loader2, Mail, ArrowLeft, X, ChevronRight, Trash2, Camera } from "lucide-react";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Employee {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  certifications: string[];
  onboarding_checklist: Record<string, boolean>;
  hired_at: string;
  notes: string | null;
  photo_url: string | null;
}

interface PerformanceRecord {
  id: string;
  employee_id: string;
  month: string;
  jobs_completed: number;
  recleans: number;
  avg_rating: number;
  avg_efficiency_pct: number;
  attendance_score: number;
}

const STATUS_COLORS: Record<string, string> = {
  onboarding: "bg-amber-100 text-amber-800 border-amber-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactive: "bg-muted text-muted-foreground border-border",
};

const CHECKLIST_LABELS: Record<string, string> = {
  documentation: "Documentation Complete",
  training: "Training Completed",
  policy_agreement: "Policy Agreement Signed",
  supplies_issued: "Supplies Issued",
};

const employeeEmailSchema = z.string().trim().email("Please enter a valid email address");

const normalizeEmployeeEmail = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const getOptionalEmployeeEmail = (value: string | null | undefined) => {
  const normalized = normalizeEmployeeEmail(value);
  if (!normalized) {
    return { success: true as const, email: null };
  }

  const parsed = employeeEmailSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Please enter a valid email address",
    };
  }

  return { success: true as const, email: parsed.data };
};

export default function TeamTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStatus, setFormStatus] = useState("onboarding");
  const [formNotes, setFormNotes] = useState("");
  const [formCerts, setFormCerts] = useState("");
  const [newCert, setNewCert] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Employee[];
    },
  });

  const { data: performance = [] } = useQuery({
    queryKey: ["employee_performance", profileEmployee?.id],
    enabled: !!profileEmployee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_performance")
        .select("*")
        .eq("employee_id", profileEmployee!.id)
        .order("month", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as unknown as PerformanceRecord[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (emp: Partial<Employee> & { id?: string }) => {
      const payload = {
        name: emp.name!,
        phone: emp.phone || null,
        email: emp.email || null,
        user_id: emp.user_id || crypto.randomUUID(),
        status: emp.status || "onboarding",
        notes: emp.notes || null,
        certifications: emp.certifications || [],
      };
      if (emp.id) {
        const { error } = await supabase.from("employees").update(payload).eq("id", emp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checklistMutation = useMutation({
    mutationFn: async ({ id, checklist }: { id: string; checklist: Record<string, boolean> }) => {
      const { error } = await supabase
        .from("employees")
        .update({ onboarding_checklist: checklist as unknown as null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Checklist updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: async (emp: Employee) => {
      const parsedEmail = getOptionalEmployeeEmail(emp.email);
      if (!parsedEmail.success || !parsedEmail.email) {
        throw new Error(parsedEmail.success ? "Employee needs a valid email address first" : parsedEmail.error);
      }

      if (parsedEmail.email !== emp.email) {
        const { error: updateError } = await supabase
          .from("employees")
          .update({ email: parsedEmail.email })
          .eq("id", emp.id);

        if (updateError) throw updateError;
      }

      const { data, error } = await supabase.functions.invoke("invite-employee", {
        body: { email: parsedEmail.email, name: emp.name.trim(), employee_id: emp.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Login invite sent!");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormStatus("onboarding");
    setFormNotes("");
    setFormCerts("");
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedEmail = getOptionalEmployeeEmail(formEmail);
    if (!parsedEmail.success) {
      toast.error(parsedEmail.error);
      return;
    }

    upsertMutation.mutate({
      name: formName,
      phone: formPhone,
      email: parsedEmail.email,
      user_id: crypto.randomUUID(),
      status: formStatus,
      notes: formNotes,
      certifications: formCerts.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setDialogOpen(false);
    resetForm();
  };

  const openProfile = (emp: Employee) => {
    setProfileEmployee(emp);
    setFormName(emp.name);
    setFormPhone(emp.phone || "");
    setFormEmail(emp.email || "");
    setFormStatus(emp.status);
    setFormNotes(emp.notes || "");
    setNewCert("");
  };

  const saveProfileField = (field: string, value: any) => {
    if (!profileEmployee) return;

    let nextValue = value;

    if (field === "email") {
      const parsedEmail = getOptionalEmployeeEmail(value);
      if (!parsedEmail.success) {
        toast.error(parsedEmail.error);
        setFormEmail(profileEmployee.email || "");
        return;
      }

      nextValue = parsedEmail.email;
      setFormEmail(parsedEmail.email || "");
    }

    const updated = { ...profileEmployee, [field]: nextValue };
    setProfileEmployee(updated);
    upsertMutation.mutate({
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      user_id: updated.user_id,
      status: updated.status,
      notes: updated.notes,
      certifications: updated.certifications,
    });
  };

  const addCert = () => {
    if (!newCert.trim() || !profileEmployee) return;
    const certs = [...(profileEmployee.certifications || []), newCert.trim()];
    setNewCert("");
    saveProfileField("certifications", certs);
  };

  const removeCert = (cert: string) => {
    if (!profileEmployee) return;
    const certs = (profileEmployee.certifications || []).filter((c) => c !== cert);
    saveProfileField("certifications", certs);
  };

  const filtered = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.email || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const checklistProgress = (checklist: Record<string, boolean>) => {
    const total = Object.keys(checklist).length;
    const done = Object.values(checklist).filter(Boolean).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // ── Profile Detail View ──
  if (profileEmployee) {
    const cl = profileEmployee.onboarding_checklist || {};
    const prog = checklistProgress(cl);
    const inviteEmailState = getOptionalEmployeeEmail(profileEmployee.email);
    const canSendInvite = inviteEmailState.success && !!inviteEmailState.email;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setProfileEmployee(null)} className="active:scale-[0.97] transition-transform">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-lg font-semibold text-foreground">{profileEmployee.name}</h2>
          <span className={`text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[profileEmployee.status] || STATUS_COLORS.inactive}`}>
            {profileEmployee.status}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Photo upload */}
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  {profileEmployee.photo_url && <AvatarImage src={profileEmployee.photo_url} alt={profileEmployee.name} />}
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {profileEmployee.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="employee-photo-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !profileEmployee) return;
                      const ext = file.name.split(".").pop();
                      const path = `${profileEmployee.id}/${crypto.randomUUID()}.${ext}`;
                      const { error: uploadError } = await supabase.storage.from("employee_photos").upload(path, file);
                      if (uploadError) { toast.error("Upload failed"); return; }
                      const { data: { publicUrl } } = supabase.storage.from("employee_photos").getPublicUrl(path);
                      const { error: updateError } = await supabase.from("employees").update({ photo_url: publicUrl }).eq("id", profileEmployee.id);
                      if (updateError) { toast.error("Failed to save photo"); return; }
                      setProfileEmployee({ ...profileEmployee, photo_url: publicUrl });
                      queryClient.invalidateQueries({ queryKey: ["employees"] });
                      toast.success("Photo updated");
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs gap-1"
                    onClick={() => document.getElementById("employee-photo-upload")?.click()}
                  >
                    <Camera className="h-3 w-3" /> Upload Photo
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onBlur={() => formName !== profileEmployee.name && saveProfileField("name", formName)}
                  className="rounded-xl mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    onBlur={() => formEmail !== (profileEmployee.email || "") && saveProfileField("email", formEmail || null)}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    onBlur={() => formPhone !== (profileEmployee.phone || "") && saveProfileField("phone", formPhone || null)}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) => {
                    setFormStatus(v);
                    saveProfileField("status", v);
                  }}
                >
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  onBlur={() => formNotes !== (profileEmployee.notes || "") && saveProfileField("notes", formNotes || null)}
                  className="rounded-xl mt-1 min-h-[80px]"
                  placeholder="Internal notes about this employee..."
                />
              </div>
              {profileEmployee.email && (
                <div className="space-y-2">
                  <Button
                    onClick={() => inviteMutation.mutate(profileEmployee)}
                    disabled={inviteMutation.isPending || !canSendInvite}
                    className="w-full rounded-full active:scale-[0.97] transition-transform"
                  >
                    {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
                    Send Login Invite
                  </Button>
                  {!canSendInvite && (
                    <p className="text-xs text-destructive">Enter a valid email address before sending an invite.</p>
                  )}
                </div>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-transform"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete Employee
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {profileEmployee.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this employee record and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        const { error } = await supabase.from("employees").delete().eq("id", profileEmployee.id);
                        if (error) {
                          toast.error("Failed to delete employee.");
                          return;
                        }
                        toast.success("Employee deleted.");
                        setProfileEmployee(null);
                        queryClient.invalidateQueries({ queryKey: ["employees"] });
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Onboarding Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Onboarding Checklist</CardTitle>
                <span className="text-xs text-muted-foreground tabular-nums">{prog.done}/{prog.total}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${prog.pct}%` }} />
              </div>
              {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={cl[key] || false}
                    onCheckedChange={(checked) => {
                      const updated = { ...cl, [key]: !!checked };
                      setProfileEmployee({ ...profileEmployee, onboarding_checklist: updated });
                      checklistMutation.mutate({ id: profileEmployee.id, checklist: updated });
                    }}
                  />
                  <span className="text-sm group-hover:text-foreground transition-colors">{label}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(profileEmployee.certifications || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No certifications yet.</p>
                )}
                {(profileEmployee.certifications || []).map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs pl-2 pr-1 py-0.5 gap-1">
                    {c}
                    <button onClick={() => removeCert(c)} className="hover:text-destructive transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  placeholder="Add certification..."
                  className="rounded-xl text-sm"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())}
                />
                <Button size="sm" variant="outline" onClick={addCert} disabled={!newCert.trim()} className="rounded-xl active:scale-[0.97] transition-transform">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Performance History</CardTitle>
            </CardHeader>
            <CardContent>
              {performance.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No performance data recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs text-right">Jobs</TableHead>
                      <TableHead className="text-xs text-right">Rating</TableHead>
                      <TableHead className="text-xs text-right">Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performance.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">
                          {new Date(p.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{p.jobs_completed}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{Number(p.avg_rating).toFixed(1)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{Number(p.avg_efficiency_pct).toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main List View ──
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] rounded-xl text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full active:scale-[0.97] transition-transform" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} required className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="rounded-xl mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Certifications (comma-separated)</Label>
                <Input value={formCerts} onChange={(e) => setFormCerts(e.target.value)} placeholder="CPR, Green Clean, OSHA" className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <Button type="submit" className="w-full rounded-full active:scale-[0.97] transition-transform" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Add Employee
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No team members yet. Add your first employee above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Certifications</TableHead>
                  <TableHead className="hidden sm:table-cell">Onboarding</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => {
                  const prog = checklistProgress(emp.onboarding_checklist || {});
                  const inviteEmailState = getOptionalEmployeeEmail(emp.email);
                  const canSendInvite = inviteEmailState.success && !!inviteEmailState.email;

                  return (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => openProfile(emp)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{emp.name}</p>
                          {emp.email && <p className="text-xs text-muted-foreground">{emp.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[emp.status] || STATUS_COLORS.inactive}`}>
                          {emp.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(emp.certifications || []).slice(0, 3).map((c) => (
                            <Badge key={c} variant="secondary" className="text-[0.6rem] px-1.5 py-0">{c}</Badge>
                          ))}
                          {(emp.certifications || []).length > 3 && (
                            <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">+{emp.certifications.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${prog.pct}%` }} />
                          </div>
                          <span className="text-[0.65rem] text-muted-foreground tabular-nums">{prog.pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {emp.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={canSendInvite ? "Send login invite" : "Add a valid email address first"}
                              disabled={inviteMutation.isPending || !canSendInvite}
                              onClick={() => inviteMutation.mutate(emp)}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openProfile(emp)}>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
