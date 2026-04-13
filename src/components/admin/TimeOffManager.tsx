import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  employees?: { name: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  denied: "bg-red-100 text-red-800",
};

export default function TimeOffManager({ isAdmin = false, employeeId }: { isAdmin?: boolean; employeeId?: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [drawerReq, setDrawerReq] = useState<TimeOffRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["time_off_requests", isAdmin, employeeId],
    queryFn: async () => {
      let query = supabase.from("time_off_requests").select("*, employees(name)").order("created_at", { ascending: false });
      if (!isAdmin && employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as TimeOffRequest[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("No employee ID");
      const { error } = await supabase.from("time_off_requests").insert({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_off_requests"] });
      toast.success("Time-off request submitted");
      setDialogOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("time_off_requests")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      const req = requests.find((r) => r.id === id);
      if (req) {
        const { data: emp } = await supabase.from("employees").select("email, name").eq("id", req.employee_id).maybeSingle();
        if (emp?.email) {
          const templateName = status === "denied" ? "time-off-denied" : "time-off-approved";
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName,
              recipientEmail: emp.email,
              idempotencyKey: `time-off-${id}-${status}`,
              templateData: {
                employeeName: emp.name,
                startDate: new Date(req.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
                endDate: new Date(req.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
                status,
              },
            },
          });
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["time_off_requests"] });
      toast.success("Request updated");
      if (drawerReq?.id === vars.id) {
        setDrawerReq({ ...drawerReq, status: vars.status, reviewed_at: new Date().toISOString() });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Time Off Requests
        </h3>
        {!isAdmin && employeeId && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="rounded-lg text-xs gap-1">
            <Plus className="h-3 w-3" />Request Time Off
          </Button>
        )}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No time-off requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <Card key={req.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrawerReq(req)}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div>
                  {isAdmin && req.employees?.name && (
                    <p className="text-sm font-medium">{req.employees.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(req.start_date), "MMM d")} — {format(new Date(req.end_date), "MMM d, yyyy")}
                  </p>
                  {req.reason && <p className="text-xs text-muted-foreground italic mt-0.5 truncate max-w-[200px]">{req.reason}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className={`text-[0.6rem] ${STATUS_BADGE[req.status] || ""}`}>
                    {req.status}
                  </Badge>
                  {isAdmin && req.status === "pending" && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); reviewMutation.mutate({ id: req.id, status: "approved" }); }}
                        disabled={reviewMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); reviewMutation.mutate({ id: req.id, status: "denied" }); }}
                        disabled={reviewMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!drawerReq} onOpenChange={(open) => { if (!open) setDrawerReq(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Time Off Request</SheetTitle>
            <SheetDescription>
              {drawerReq?.employees?.name || "Employee"} — {drawerReq?.status}
            </SheetDescription>
          </SheetHeader>
          {drawerReq && (
            <div className="space-y-5 mt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Employee</span>
                  <span className="font-medium text-foreground">{drawerReq.employees?.name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium text-foreground">{format(new Date(drawerReq.start_date), "MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium text-foreground">{format(new Date(drawerReq.end_date), "MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className={`text-[0.6rem] ${STATUS_BADGE[drawerReq.status] || ""}`}>
                    {drawerReq.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium text-foreground">{format(new Date(drawerReq.created_at), "MMM d, yyyy h:mm a")}</span>
                </div>
                {drawerReq.reviewed_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reviewed</span>
                    <span className="font-medium text-foreground">{format(new Date(drawerReq.reviewed_at), "MMM d, yyyy h:mm a")}</span>
                  </div>
                )}
              </div>

              {drawerReq.reason && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm text-foreground">{drawerReq.reason}</p>
                </div>
              )}

              {/* Alter Decision */}
              {isAdmin && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    {drawerReq.status === "pending" ? "Review Request" : "Alter Decision"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={drawerReq.status === "approved" ? "default" : "outline"}
                      className="rounded-lg text-xs"
                      disabled={drawerReq.status === "approved" || reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ id: drawerReq.id, status: "approved" })}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant={drawerReq.status === "denied" ? "destructive" : "outline"}
                      className="rounded-lg text-xs"
                      disabled={drawerReq.status === "denied" || reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ id: drawerReq.id, status: "denied" })}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Deny
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Request Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl mt-1 text-sm min-h-[60px]" />
            </div>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !startDate || !endDate}
              className="w-full rounded-full"
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
