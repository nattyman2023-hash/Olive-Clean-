import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, Search, User, BarChart3, ClipboardCheck, Loader2, Mail, ArrowLeft, X, ChevronRight, Trash2, Camera, KeyRound, Eye } from "lucide-react";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SetPasswordDialog from "./SetPasswordDialog";

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
  pay_type: string;
  fixed_job_rate: number | null;
  worker_classification: string;
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

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  staff: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cleaning_technician: "bg-emerald-100 text-emerald-800 border-emerald-200",
  finance: "bg-blue-100 text-blue-800 border-blue-200",
  dispatcher: "bg-purple-100 text-purple-800 border-purple-200",
  admin_assistant: "bg-amber-100 text-amber-800 border-amber-200",
  client: "bg-sky-100 text-sky-800 border-sky-200",
};

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

export default function TeamTab({ readOnly }: { readOnly?: boolean }) {
  const { startImpersonation, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStatus, setFormStatus] = useState("onboarding");
  const [formNotes, setFormNotes] = useState("");
  const [formCerts, setFormCerts] = useState("");
  const [newCert, setNewCert] = useState("");
  const [formPayType, setFormPayType] = useState("hourly");
  const [formFixedRate, setFormFixedRate] = useState("");
  const [formClassification, setFormClassification] = useState("w2");
  const [formRole, setFormRole] = useState("");

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

  // Fetch custom roles for Add dialog dropdown
  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("name, description")
        .order("created_at");
      if (error) throw error;
      return data as Array<{ name: string; description: string | null }>;
    },
  });

  // Fetch all user_roles for displayed employees (for badges)
  const employeeUserIds = employees.map((e) => e.user_id);
  const { data: allUserRoles = [] } = useQuery({
    queryKey: ["all_user_roles", employeeUserIds.join(",")],
    enabled: employeeUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", employeeUserIds);
      if (error) throw error;
      return data as Array<{ user_id: string; role: string }>;
    },
  });

  const rolesByUserId = allUserRoles.reduce<Record<string, string[]>>((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = [];
    acc[r.user_id].push(r.role);
    return acc;
  }, {});

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
      const payload: Record<string, any> = {
        name: emp.name!,
        phone: emp.phone || null,
        email: emp.email || null,
        user_id: emp.user_id || crypto.randomUUID(),
        status: emp.status || "onboarding",
        notes: emp.notes || null,
        certifications: emp.certifications || [],
        pay_type: emp.pay_type || "hourly",
        fixed_job_rate: emp.fixed_job_rate ?? null,
        worker_classification: emp.worker_classification || "w2",
      };
      if (emp.id) {
        const { error } = await supabase.from("employees").update(payload as any).eq("id", emp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload as any);
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
    setFormPayType("hourly");
    setFormFixedRate("");
    setFormClassification("w2");
    setFormRole("");
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedEmail = getOptionalEmployeeEmail(formEmail);
    if (!parsedEmail.success) {
      toast.error(parsedEmail.error);
      return;
    }

    const newUserId = crypto.randomUUID();
    const newId = crypto.randomUUID();

    // Create employee record
    const payload: Record<string, any> = {
      id: newId,
      name: formName,
      phone: formPhone || null,
      email: parsedEmail.email,
      user_id: newUserId,
      status: formStatus,
      notes: formNotes || null,
      certifications: formCerts.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const { error: insertError } = await supabase.from("employees").insert(payload as any);
    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Employee added");

    // Auto-invite if email provided
    if (parsedEmail.email) {
      try {
        const { data, error } = await supabase.functions.invoke("invite-employee", {
          body: { email: parsedEmail.email, name: formName.trim(), employee_id: newId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const authUserId = data?.user_id;
        toast.success("Login invite sent!");

        // Assign selected role if one was chosen
        if (formRole && authUserId) {
          await supabase.from("user_roles").insert({ user_id: authUserId, role: formRole as any });
        }

        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["all_user_roles"] });
      } catch (err: any) {
        toast.error(`Invite failed: ${err.message}`);
      }
    }

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
    setFormPayType(emp.pay_type || "hourly");
    setFormFixedRate(emp.fixed_job_rate != null ? String(emp.fixed_job_rate) : "");
    setFormClassification(emp.worker_classification || "w2");
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
      pay_type: updated.pay_type,
      fixed_job_rate: updated.fixed_job_rate,
      worker_classification: updated.worker_classification,
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
                  {!readOnly && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onBlur={() => formName !== profileEmployee.name && saveProfileField("name", formName)}
                  className="rounded-xl mt-1"
                  disabled={readOnly}
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
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    onBlur={() => formPhone !== (profileEmployee.phone || "") && saveProfileField("phone", formPhone || null)}
                    className="rounded-xl mt-1"
                    disabled={readOnly}
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
                  disabled={readOnly}
                >
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Pay Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Pay Type</Label>
                  <Select
                    value={formPayType}
                    onValueChange={(v) => {
                      setFormPayType(v);
                      saveProfileField("pay_type", v);
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="per_job">Fixed Per Job</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formPayType === "per_job" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Fixed Rate ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formFixedRate}
                      onChange={(e) => setFormFixedRate(e.target.value)}
                      onBlur={() => {
                        const val = formFixedRate ? parseFloat(formFixedRate) : null;
                        if (val !== profileEmployee.fixed_job_rate) saveProfileField("fixed_job_rate", val);
                      }}
                      className="rounded-xl mt-1"
                      placeholder="e.g. 100"
                      disabled={readOnly}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Worker Classification</Label>
                <Select
                  value={formClassification}
                  onValueChange={(v) => {
                    setFormClassification(v);
                    saveProfileField("worker_classification", v);
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w2">W-2 / Staff</SelectItem>
                    <SelectItem value="contractor">1099 / Contractor</SelectItem>
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
                  disabled={readOnly}
                />
              </div>
              {!readOnly && profileEmployee.email && (
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
              <Button
                variant="outline"
                onClick={() => {
                  startImpersonation(profileEmployee.user_id, 'staff', profileEmployee.name);
                  navigate('/employee');
                }}
                className="w-full rounded-full active:scale-[0.97] transition-transform"
              >
                <Eye className="h-4 w-4 mr-1" /> View Portal
              </Button>
              {!readOnly && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setPasswordDialogOpen(true)}
                    className="w-full rounded-full active:scale-[0.97] transition-transform"
                  >
                    <KeyRound className="h-4 w-4 mr-1" /> Set Password
                  </Button>
                  <SetPasswordDialog
                    open={passwordDialogOpen}
                    onOpenChange={setPasswordDialogOpen}
                    userId={profileEmployee.user_id}
                    userName={profileEmployee.name}
                  />
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Role Assignment (admin-only, not in read-only) */}
          {isAdmin && !readOnly && (
            <RoleAssignmentCard userId={profileEmployee.user_id} employeeName={profileEmployee.name} />
          )}

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
                    disabled={readOnly}
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
                    {!readOnly && (
                      <button onClick={() => removeCert(c)} className="hover:text-destructive transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {!readOnly && (
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
              )}
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
      {/* Trade Approvals */}
      <TradeApprovals />
      {/* Team Announcements */}
      <TeamAnnouncements />
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
        {!readOnly && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full active:scale-[0.97] transition-transform" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-1" /> Add Team Member
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
                <Label className="text-xs">Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select role..." /></SelectTrigger>
                  <SelectContent>
                    {customRoles.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        {r.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                Add Team Member
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        )}
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-sm">{emp.name}</p>
                            {(rolesByUserId[emp.user_id] || []).map((role) => (
                              <span
                                key={role}
                                className={`text-[0.55rem] font-semibold uppercase tracking-wider px-1.5 py-0 rounded-full border ${ROLE_BADGE_COLORS[role] || "bg-muted text-muted-foreground border-border"}`}
                              >
                                {role.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
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

function TradeApprovals() {
  const queryClient = useQueryClient();

  const { data: trades = [] } = useQuery({
    queryKey: ["admin_trade_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_trade_requests" as any)
        .select("*, employees!shift_trade_requests_requester_id_fkey(name, user_id)")
        .eq("status", "pending_admin")
        .order("created_at", { ascending: false });
      if (error) {
        // fallback without join
        const { data: d2, error: e2 } = await supabase
          .from("shift_trade_requests" as any)
          .select("*")
          .eq("status", "pending_admin")
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return (d2 as any[]) || [];
      }
      return (data as any[]) || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (trade: any) => {
      // Swap assigned_to on both jobs
      if (trade.target_job_id) {
        const { data: jobs } = await supabase.from("jobs").select("id, assigned_to").in("id", [trade.requester_job_id, trade.target_job_id]);
        if (jobs && jobs.length === 2) {
          const j1 = jobs.find((j: any) => j.id === trade.requester_job_id);
          const j2 = jobs.find((j: any) => j.id === trade.target_job_id);
          if (j1 && j2) {
            await supabase.from("jobs").update({ assigned_to: j2.assigned_to }).eq("id", j1.id);
            await supabase.from("jobs").update({ assigned_to: j1.assigned_to }).eq("id", j2.id);
          }
        }
      } else {
        // Simple reassign: move requester's job to target employee
        if (trade.target_id) {
          const { data: targetEmp } = await supabase.from("employees").select("user_id").eq("id", trade.target_id).maybeSingle();
          if (targetEmp) {
            await supabase.from("jobs").update({ assigned_to: targetEmp.user_id }).eq("id", trade.requester_job_id);
          }
        }
      }
      await supabase.from("shift_trade_requests" as any).update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", trade.id);

      // Notify both employees
      const userIds: string[] = [];
      if (trade.requester_id) {
        const { data: e1 } = await supabase.from("employees").select("user_id").eq("id", trade.requester_id).maybeSingle();
        if (e1) userIds.push(e1.user_id);
      }
      if (trade.target_id) {
        const { data: e2 } = await supabase.from("employees").select("user_id").eq("id", trade.target_id).maybeSingle();
        if (e2) userIds.push(e2.user_id);
      }
      if (userIds.length > 0) {
        await supabase.from("notifications" as any).insert(
          userIds.map(uid => ({ user_id: uid, type: "trade_approved", title: "Shift trade approved!", body: "Your shift trade has been approved by admin." }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_trade_requests"] });
      toast.success("Trade approved");
    },
    onError: () => toast.error("Failed to approve trade"),
  });

  const denyMutation = useMutation({
    mutationFn: async (trade: any) => {
      await supabase.from("shift_trade_requests" as any).update({ status: "denied", updated_at: new Date().toISOString() }).eq("id", trade.id);
      const userIds: string[] = [];
      if (trade.requester_id) {
        const { data: e1 } = await supabase.from("employees").select("user_id").eq("id", trade.requester_id).maybeSingle();
        if (e1) userIds.push(e1.user_id);
      }
      if (trade.target_id) {
        const { data: e2 } = await supabase.from("employees").select("user_id").eq("id", trade.target_id).maybeSingle();
        if (e2) userIds.push(e2.user_id);
      }
      if (userIds.length > 0) {
        await supabase.from("notifications" as any).insert(
          userIds.map(uid => ({ user_id: uid, type: "trade_denied", title: "Shift trade denied", body: "Your shift trade was not approved." }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_trade_requests"] });
      toast.success("Trade denied");
    },
  });

  if (trades.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Shift Trade Approvals
          <Badge variant="destructive" className="text-[0.6rem] px-1.5 py-0">{trades.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {trades.map((trade: any) => (
          <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <p className="text-xs font-medium text-foreground">
                {(trade.employees as any)?.name || "Employee"} wants to trade a shift
              </p>
              <p className="text-[0.6rem] text-muted-foreground">Status: pending admin approval</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-7 rounded-lg text-xs gap-1" onClick={() => approveMutation.mutate(trade)} disabled={approveMutation.isPending}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs gap-1" onClick={() => denyMutation.mutate(trade)} disabled={denyMutation.isPending}>
                Deny
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TeamAnnouncements() {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["team_messages_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_messages" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ message, days }: { message: string; days: number | "" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const expiresAt = days ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null;
      const { error } = await supabase.from("team_messages" as any).insert({
        author_id: user.id,
        message,
        expires_at: expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_messages_admin"] });
      toast.success("Announcement posted");
      setNewMessage("");
      setExpiresInDays("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_messages" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_messages_admin"] });
      toast.success("Message deleted");
    },
  });

  const extendMutation = useMutation({
    mutationFn: async ({ id, currentExpiry }: { id: string; currentExpiry: string | null }) => {
      const base = currentExpiry ? new Date(currentExpiry) : new Date();
      const newExpiry = new Date(base.getTime() + 7 * 86400000).toISOString();
      const { error } = await supabase.from("team_messages" as any).update({ expires_at: newExpiry }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_messages_admin"] });
      toast.success("Extended by 7 days");
    },
  });

  const isExpired = (msg: any) => msg.expires_at && new Date(msg.expires_at) < new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Team Announcements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Post an announcement to your team..."
            className="rounded-xl text-sm min-h-[60px]"
          />
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <label>Expires in</label>
              <Input
                type="number"
                min={1}
                placeholder="days"
                className="w-20 h-7 text-xs"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : "")}
              />
              <span className="text-[0.65rem]">days (blank = never)</span>
            </div>
            <Button
              size="sm"
              onClick={() => postMutation.mutate({ message: newMessage.trim(), days: expiresInDays })}
              disabled={!newMessage.trim() || postMutation.isPending}
              className="rounded-full active:scale-[0.97] transition-transform"
            >
              {postMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Post
            </Button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No announcements yet.</p>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} className={`flex items-start justify-between p-3 rounded-lg border border-border ${isExpired(msg) ? "bg-destructive/5 opacity-60" : "bg-muted/50"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground">{msg.message}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-[0.6rem] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  {msg.expires_at && (
                    <Badge variant={isExpired(msg) ? "destructive" : "secondary"} className="text-[0.55rem] h-4 px-1.5">
                      {isExpired(msg) ? "Expired" : `Expires ${new Date(msg.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </Badge>
                  )}
                  {!msg.expires_at && (
                    <Badge variant="outline" className="text-[0.55rem] h-4 px-1.5">No expiry</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[0.6rem]"
                  onClick={() => extendMutation.mutate({ id: msg.id, currentExpiry: msg.expires_at })}
                  disabled={extendMutation.isPending}
                >
                  +7d
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => deleteMutation.mutate(msg.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Role Assignment Card ---------- */

function RoleAssignmentCard({ userId, employeeName }: { userId: string; employeeName: string }) {
  const queryClient = useQueryClient();

  // Check if this employee has a real auth account (profile exists via trigger)
  const { data: hasAccount, isLoading: accountLoading } = useQuery({
    queryKey: ["profile_exists", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  // Fetch available roles from custom_roles table
  const { data: availableRoles = [] } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("name, description")
        .order("created_at");
      if (error) throw error;
      return data as Array<{ name: string; description: string | null }>;
    },
  });

  const { data: currentRoles = [], isLoading } = useQuery({
    queryKey: ["user_roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return data.map((r) => r.role);
    },
    enabled: !!hasAccount,
  });

  const toggleRole = async (role: string) => {
    const has = currentRoles.includes(role as any);
    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as any);
      if (error) { toast.error(error.message || "Failed to remove role"); return; }
      toast.success(`Removed ${role} role from ${employeeName}`);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (error) { toast.error(error.message || "Failed to add role"); return; }
      toast.success(`Added ${role} role to ${employeeName}`);
    }
    queryClient.invalidateQueries({ queryKey: ["user_roles", userId] });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {accountLoading || isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : !hasAccount ? (
          <p className="text-xs text-muted-foreground italic">
            This employee has no login account — roles can only be assigned to users with accounts.
          </p>
        ) : (
          availableRoles.map((r) => (
            <label key={r.name} className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={currentRoles.includes(r.name as any)}
                onCheckedChange={() => toggleRole(r.name)}
              />
              <div>
                <span className="text-sm font-medium group-hover:text-foreground transition-colors capitalize">{r.name.replace(/_/g, " ")}</span>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
              </div>
            </label>
          ))
        )}
      </CardContent>
    </Card>
  );
}
