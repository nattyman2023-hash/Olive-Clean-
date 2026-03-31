import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

      // Send time-off decision email to the employee
      const req = requests.find((r) => r.id === id);
      if (req) {
        const { data: emp } = await supabase.from("employees").select("email, name").eq("id", req.employee_id).maybeSingle();
        if (emp?.email) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "time-off-approved",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_off_requests"] });
      toast.success("Request updated");
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
            <Card key={req.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div>
                  {isAdmin && req.employees?.name && (
                    <p className="text-sm font-medium">{req.employees.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(req.start_date), "MMM d")} — {format(new Date(req.end_date), "MMM d, yyyy")}
                  </p>
                  {req.reason && <p className="text-xs text-muted-foreground italic mt-0.5">{req.reason}</p>}
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
                        onClick={() => reviewMutation.mutate({ id: req.id, status: "approved" })}
                        disabled={reviewMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => reviewMutation.mutate({ id: req.id, status: "denied" })}
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
