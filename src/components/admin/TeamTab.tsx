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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, User, BarChart3, ClipboardCheck, Loader2 } from "lucide-react";

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

export default function TeamTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailView, setDetailView] = useState<"checklist" | "performance" | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStatus, setFormStatus] = useState("onboarding");
  const [formNotes, setFormNotes] = useState("");
  const [formCerts, setFormCerts] = useState("");

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
    queryKey: ["employee_performance", selectedEmployee?.id],
    enabled: !!selectedEmployee && detailView === "performance",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_performance")
        .select("*")
        .eq("employee_id", selectedEmployee!.id)
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
      toast.success(selectedEmployee ? "Employee updated" : "Employee added");
      resetForm();
      setDialogOpen(false);
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

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormStatus("onboarding");
    setFormNotes("");
    setFormCerts("");
    setSelectedEmployee(null);
  };

  const openEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormName(emp.name);
    setFormPhone(emp.phone || "");
    setFormEmail(emp.email || "");
    setFormStatus(emp.status);
    setFormNotes(emp.notes || "");
    setFormCerts((emp.certifications || []).join(", "));
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate({
      id: selectedEmployee?.id,
      name: formName,
      phone: formPhone,
      email: formEmail,
      user_id: selectedEmployee?.user_id || crypto.randomUUID(),
      status: formStatus,
      notes: formNotes,
      certifications: formCerts.split(",").map((s) => s.trim()).filter(Boolean),
    });
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

  // Detail views
  if (selectedEmployee && detailView === "checklist") {
    const cl = selectedEmployee.onboarding_checklist;
    const prog = checklistProgress(cl);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">{selectedEmployee.name} — Onboarding</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{prog.done}/{prog.total} complete ({prog.pct}%)</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployee(null); setDetailView(null); }}>
            ← Back
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full transition-all" style={{ width: `${prog.pct}%` }} />
          </div>
          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={cl[key] || false}
                onCheckedChange={(checked) => {
                  const updated = { ...cl, [key]: !!checked };
                  setSelectedEmployee({ ...selectedEmployee, onboarding_checklist: updated });
                  checklistMutation.mutate({ id: selectedEmployee.id, checklist: updated });
                }}
              />
              <span className="text-sm group-hover:text-foreground transition-colors">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (selectedEmployee && detailView === "performance") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">{selectedEmployee.name} — Performance</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployee(null); setDetailView(null); }}>
            ← Back
          </Button>
        </CardHeader>
        <CardContent>
          {performance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No performance data recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Re-cleans</TableHead>
                  <TableHead className="text-right">Avg Rating</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-xs">
                      {new Date(p.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.jobs_completed}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.recleans}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(p.avg_rating).toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(p.avg_efficiency_pct).toFixed(0)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(p.attendance_score).toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  }

  // Main list view
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
            <Button size="sm" className="rounded-full active:scale-[0.97] transition-transform">
              <Plus className="h-4 w-4 mr-1" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
                {selectedEmployee ? "Update" : "Add"} Employee
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
                  return (
                    <TableRow key={emp.id}>
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
                          {(emp.certifications || []).map((c) => (
                            <Badge key={c} variant="secondary" className="text-[0.6rem] px-1.5 py-0">{c}</Badge>
                          ))}
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedEmployee(emp); setDetailView("checklist"); }}>
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedEmployee(emp); setDetailView("performance"); }}>
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(emp)}>
                            Edit
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
