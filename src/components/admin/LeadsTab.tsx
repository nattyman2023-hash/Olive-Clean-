import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Search, MessageCircle, FileText, Phone, Mail, MapPin, ArrowRight, AlertCircle, User, Loader2, Pencil, Trash2, Eye, X } from "lucide-react";

const STATUS_ORDER = ["new", "quoted", "scheduled", "converted"] as const;
const STATUS_LABELS: Record<string, string> = { new: "New", quoted: "Quoted", scheduled: "Scheduled", converted: "Converted" };
const STATUS_COLORS: Record<string, string> = { new: "bg-blue-100 text-blue-800", quoted: "bg-amber-100 text-amber-800", scheduled: "bg-primary/10 text-primary", converted: "bg-emerald-100 text-emerald-800" };

function scoreColor(score: number) {
  if (score >= 60) return "bg-emerald-100 text-emerald-800";
  if (score >= 30) return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground";
}

export default function LeadsTab({ onNavigate }: { onNavigate?: (section: string, targetId?: string) => void }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("leads-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Lead status updated");
    },
  });

  const updateLead = useMutation({
    mutationFn: async (lead: any) => {
      const { id, ...updates } = lead;
      const { error } = await supabase.from("leads").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setEditingLead(null);
      toast.success("Lead updated");
    },
    onError: (e) => toast.error("Update failed: " + (e as Error).message),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setDeleteLeadId(null);
      setSelectedLead(null);
      toast.success("Lead deleted");
    },
    onError: (e) => toast.error("Delete failed: " + (e as Error).message),
  });

  const convertToJob = useMutation({
    mutationFn: async (lead: any) => {
      let clientId: string;
      if (lead.email) {
        const { data: existing } = await supabase.from("clients").select("id").eq("email", lead.email).maybeSingle();
        if (existing) {
          clientId = existing.id;
        } else {
          const { data: newClient, error } = await supabase.from("clients").insert({
            name: lead.name || "New Client",
            email: lead.email,
            phone: lead.phone,
            address: lead.location,
          }).select("id").single();
          if (error) throw error;
          clientId = newClient!.id;
        }
      } else {
        const { data: newClient, error } = await supabase.from("clients").insert({
          name: lead.name || "New Client",
          phone: lead.phone,
        }).select("id").single();
        if (error) throw error;
        clientId = newClient!.id;
      }

      const { data: job, error: jobErr } = await supabase.from("jobs").insert({
        client_id: clientId,
        service: lead.frequency === "one-time" ? "deep-clean" : "general",
        scheduled_at: new Date().toISOString(),
        status: "scheduled",
        notes: `Converted from lead. ${lead.notes || ""}`.trim(),
      }).select("id").single();
      if (jobErr) throw jobErr;

      await supabase.from("leads").update({ status: "converted", converted_job_id: job!.id } as any).eq("id", lead.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Lead converted to job!");
    },
    onError: (e) => toast.error("Conversion failed: " + (e as Error).message),
  });

  const filtered = leads.filter((l: any) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return [l.name, l.email, l.phone, l.location].some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_ORDER.map(s => {
          const count = leads.filter((l: any) => l.status === s).length;
          return (
            <Card key={s} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setStatusFilter(s)}>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leads list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No leads found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead: any) => {
            const isStale = lead.status === "new" && new Date(lead.created_at).getTime() < twoHoursAgo;
            return (
              <Card key={lead.id} className={`${isStale ? "border-destructive/50 bg-destructive/5" : ""}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{lead.name || "Unknown"}</p>
                        <Badge variant="secondary" className={scoreColor(lead.score)}>Score: {lead.score}</Badge>
                        <Badge variant="secondary" className={STATUS_COLORS[lead.status] || ""}>{STATUS_LABELS[lead.status] || lead.status}</Badge>
                        {lead.source === "chatbot" && <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                        {lead.source === "form" && <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                        {isStale && <span className="inline-flex items-center gap-1 text-[0.65rem] text-destructive font-medium"><AlertCircle className="h-3 w-3" /> No follow-up</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {lead.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
                        {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>}
                        {lead.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.location}</span>}
                        {lead.bedrooms && <span>{lead.bedrooms} bed / {lead.bathrooms || "?"} bath</span>}
                        {lead.frequency && <span className="capitalize">{lead.frequency}</span>}
                      </div>
                      <p className="text-[0.65rem] text-muted-foreground">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedLead(lead)} title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingLead({ ...lead })} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteLeadId(lead.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                      {lead.status !== "converted" && (
                        <>
                          {lead.status === "new" && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                              // Navigate to quotes tab and trigger new quote form with lead data pre-filled
                              if (onNavigate) {
                                // Store lead data in sessionStorage for the quote form to pick up
                                sessionStorage.setItem("prefill-quote", JSON.stringify({
                                  leadId: lead.id,
                                  name: lead.name,
                                  email: lead.email,
                                  phone: lead.phone,
                                  address: lead.location,
                                  service: lead.frequency === "one-time" ? "deep-clean" : "general",
                                  bedrooms: lead.bedrooms,
                                  bathrooms: lead.bathrooms,
                                }));
                                onNavigate("quotes");
                              }
                            }}>
                              <FileText className="h-3 w-3 mr-1" /> Create Quote
                            </Button>
                          )}
                          {lead.status === "quoted" && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus.mutate({ id: lead.id, status: "scheduled" })}>
                              Mark Scheduled
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="text-xs h-7 bg-primary hover:bg-primary/90"
                            onClick={() => convertToJob.mutate(lead)}
                            disabled={convertToJob.isPending}
                          >
                            Convert to Job <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(o) => { if (!o) setSelectedLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{selectedLead.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={STATUS_COLORS[selectedLead.status] || ""}>{STATUS_LABELS[selectedLead.status] || selectedLead.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-foreground">{selectedLead.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-foreground">{selectedLead.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-foreground">{selectedLead.location || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <Badge variant="secondary" className={scoreColor(selectedLead.score)}>{selectedLead.score}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-foreground capitalize">{selectedLead.source}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frequency</p>
                  <p className="text-foreground capitalize">{selectedLead.frequency || "—"}</p>
                </div>
                {selectedLead.bedrooms && (
                  <div>
                    <p className="text-xs text-muted-foreground">Home Size</p>
                    <p className="text-foreground">{selectedLead.bedrooms} bed / {selectedLead.bathrooms || "?"} bath</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Urgency</p>
                  <p className="text-foreground capitalize">{selectedLead.urgency || "—"}</p>
                </div>
              </div>
              {selectedLead.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{selectedLead.notes}</p>
                </div>
              )}
              {selectedLead.chat_transcript && Array.isArray(selectedLead.chat_transcript) && selectedLead.chat_transcript.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Chat Transcript</p>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                    {selectedLead.chat_transcript.map((msg: any, idx: number) => (
                      <div key={idx} className={`text-xs ${msg.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
                        <span className="font-medium">{msg.role === "user" ? "Visitor" : "Olivia"}:</span>{" "}
                        {msg.content || msg.text || JSON.stringify(msg)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[0.65rem] text-muted-foreground">
                Created {format(new Date(selectedLead.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => { setEditingLead({ ...selectedLead }); setSelectedLead(null); }}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-xs rounded-lg text-destructive hover:text-destructive" onClick={() => { setDeleteLeadId(selectedLead.id); setSelectedLead(null); }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={!!editingLead} onOpenChange={(o) => { if (!o) setEditingLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={editingLead.name || ""} onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })} className="rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={editingLead.email || ""} onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })} className="rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input value={editingLead.phone || ""} onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })} className="rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Location</label>
                  <Input value={editingLead.location || ""} onChange={(e) => setEditingLead({ ...editingLead, location: e.target.value })} className="rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select value={editingLead.status} onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Frequency</label>
                  <Input value={editingLead.frequency || ""} onChange={(e) => setEditingLead({ ...editingLead, frequency: e.target.value })} className="rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bedrooms</label>
                  <Input type="number" value={editingLead.bedrooms || ""} onChange={(e) => setEditingLead({ ...editingLead, bedrooms: e.target.value ? Number(e.target.value) : null })} className="rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bathrooms</label>
                  <Input type="number" value={editingLead.bathrooms || ""} onChange={(e) => setEditingLead({ ...editingLead, bathrooms: e.target.value ? Number(e.target.value) : null })} className="rounded-lg" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea value={editingLead.notes || ""} onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })} rows={2} className="rounded-lg" />
              </div>
              <Button
                onClick={() => updateLead.mutate(editingLead)}
                disabled={updateLead.isPending}
                className="w-full rounded-lg"
              >
                {updateLead.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this lead and its data. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteLeadId && deleteLead.mutate(deleteLeadId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
