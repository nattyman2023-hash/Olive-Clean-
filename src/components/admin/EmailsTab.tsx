import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Mail, CheckCircle2, XCircle, AlertTriangle, Send, Eye, SendHorizonal, Search, RotateCw, ExternalLink, TrendingUp, ShieldCheck } from "lucide-react";
import { format, subDays, subHours } from "date-fns";
import { toast } from "sonner";

type TimeRange = "24h" | "7d" | "30d" | "custom";
type StatusFilter = "all" | "sent" | "dlq" | "suppressed";

interface EmailLogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  email_body: string | null;
}

interface TemplatePreview {
  templateName: string;
  displayName: string;
  subject: string;
  html: string;
  status: "ready" | "preview_data_required" | "render_failed";
  errorMessage?: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  dlq: { label: "Failed", className: "bg-red-100 text-red-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  suppressed: { label: "Suppressed", className: "bg-yellow-100 text-yellow-800" },
  bounced: { label: "Bounced", className: "bg-orange-100 text-orange-800" },
  complained: { label: "Complained", className: "bg-rose-100 text-rose-800" },
};

const PAGE_SIZE = 50;

export default function EmailsTab() {
  return (
    <Tabs defaultValue="logs" className="space-y-6">
      <TabsList className="rounded-lg">
        <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
        <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="logs"><EmailLogsView /></TabsContent>
      <TabsContent value="templates"><TemplatesPreviewView /></TabsContent>
    </Tabs>
  );
}

/* ─── Logs View ─── */
function EmailLogsView() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [previewRow, setPreviewRow] = useState<EmailLogRow | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (timeRange === "custom" && customStart && customEnd) {
      return { start: new Date(customStart).toISOString(), end: new Date(customEnd + "T23:59:59").toISOString() };
    }
    const map: Record<string, Date> = { "24h": subHours(now, 24), "7d": subDays(now, 7), "30d": subDays(now, 30) };
    return { start: (map[timeRange] || map["7d"]).toISOString(), end: now.toISOString() };
  }, [timeRange, customStart, customEnd]);

  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ["email-logs", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("*")
        .gte("created_at", dateRange.start)
        .lte("created_at", dateRange.end)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as EmailLogRow[];
    },
  });

  const dedupedLogs = useMemo(() => {
    const byId = new Map<string, EmailLogRow>();
    for (const row of rawLogs) {
      const key = row.message_id || row.id;
      const existing = byId.get(key);
      if (!existing || new Date(row.created_at) > new Date(existing.created_at)) byId.set(key, row);
    }
    return Array.from(byId.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rawLogs]);

  const templateNames = useMemo(() => [...new Set(dedupedLogs.map((l) => l.template_name))].sort(), [dedupedLogs]);

  const filtered = useMemo(() => {
    return dedupedLogs.filter((l) => {
      if (templateFilter !== "all" && l.template_name !== templateFilter) return false;
      if (statusFilter === "sent" && l.status !== "sent") return false;
      if (statusFilter === "dlq" && !["dlq", "failed"].includes(l.status)) return false;
      if (statusFilter === "suppressed" && l.status !== "suppressed") return false;
      if (searchQuery && !l.recipient_email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [dedupedLogs, templateFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = dedupedLogs.length;
    const sent = dedupedLogs.filter((l) => l.status === "sent").length;
    const failed = dedupedLogs.filter((l) => ["dlq", "failed", "bounced"].includes(l.status)).length;
    const suppressed = dedupedLogs.filter((l) => l.status === "suppressed").length;
    const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    const deliverySuccess = (sent + failed) > 0 ? Math.round((sent / (sent + failed)) * 100) : 0;
    return { total, sent, failed, suppressed, deliveryRate, deliverySuccess };
  }, [dedupedLogs]);

  const handleResend = async (row: EmailLogRow) => {
    setResendingId(row.id);
    try {
      const meta = row.metadata as Record<string, any> | null;
      const templateData = meta?.templateData || {};
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: row.template_name,
          recipientEmail: row.recipient_email,
          templateData,
          idempotencyKey: `resend-${row.message_id || row.id}-${Date.now()}`,
        },
      });
      if (error) throw error;
      toast.success(`Resent to ${row.recipient_email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend email.");
    } finally {
      setResendingId(null);
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Time range */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["24h", "7d", "30d", "custom"] as TimeRange[]).map((r) => (
          <Button key={r} size="sm" variant={timeRange === r ? "default" : "outline"} className="rounded-lg text-xs" onClick={() => { setTimeRange(r); setPage(0); }}>
            {r === "24h" ? "Last 24h" : r === "7d" ? "Last 7 days" : r === "30d" ? "Last 30 days" : "Custom"}
          </Button>
        ))}
        {timeRange === "custom" && (
          <>
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-auto rounded-lg text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-auto rounded-lg text-xs" />
          </>
        )}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            className="pl-9 rounded-lg text-xs"
          />
        </div>
        <Select value={templateFilter} onValueChange={(v) => { setTemplateFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[200px] rounded-lg text-xs"><SelectValue placeholder="All templates" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templateNames.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {(["all", "sent", "dlq", "suppressed"] as StatusFilter[]).map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="rounded-lg text-xs" onClick={() => { setStatusFilter(s); setPage(0); }}>
              {s === "all" ? "All" : s === "dlq" ? "Failed" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={<Mail className="h-4 w-4" />} label="Total Sent" value={String(stats.total)} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Delivered" value={String(stats.sent)} />
        <StatCard icon={<XCircle className="h-4 w-4 text-red-600" />} label="Failed" value={String(stats.failed)} />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-blue-600" />} label="Delivery Rate" value={`${stats.deliveryRate}%`} />
        <StatCard icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} label="Delivery Success" value={`${stats.deliverySuccess}%`} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><Send className="h-8 w-8 mx-auto mb-3 opacity-30" />No emails found for this period.</CardContent></Card>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Template</TableHead>
                  <TableHead className="text-xs">Recipient</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Error</TableHead>
                  <TableHead className="text-xs">Ref</TableHead>
                  <TableHead className="text-xs w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((row) => {
                  const badge = STATUS_BADGE[row.status] || STATUS_BADGE.pending;
                  const isFailed = ["dlq", "failed", "bounced"].includes(row.status);
                  const meta = row.metadata as Record<string, any> | null;
                  const refLink = meta?.job_id
                    ? { label: "Job", section: "jobs" }
                    : meta?.quote_id
                    ? { label: "Quote", section: "quotes" }
                    : meta?.invoice_id
                    ? { label: "Invoice", section: "finance" }
                    : null;

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-medium">{row.template_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.recipient_email}</TableCell>
                      <TableCell><Badge variant="secondary" className={`text-[0.6rem] ${badge.className}`}>{badge.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(row.created_at), "MMM d, h:mm a")}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">{row.error_message || "—"}</TableCell>
                      <TableCell>
                        {refLink ? (
                          <span className="inline-flex items-center gap-1 text-xs text-primary cursor-pointer hover:underline">
                            <ExternalLink className="h-3 w-3" />
                            {refLink.label}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {isFailed && row.template_name !== "auth_emails" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1"
                            disabled={resendingId === row.id}
                            onClick={() => handleResend(row)}
                          >
                            {resendingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                            Resend
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{filtered.length} emails</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg text-xs">Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded-lg text-xs">Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Templates Preview View ─── */
function TemplatesPreviewView() {
  const { session, isAdmin, rolesLoading } = useAuth();
  const [selected, setSelected] = useState<TemplatePreview | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-template-previews", session?.access_token],
    enabled: !!session?.access_token && isAdmin && !rolesLoading,
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/preview-transactional-email`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || json?.message || "Failed to fetch previews");
      }

      return (json?.templates || []) as TemplatePreview[];
    },
  });

  const handleSendTest = async (tpl: TemplatePreview) => {
    setSendingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { toast.error("No email found for your account."); return; }
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: tpl.templateName,
          recipientEmail: user.email,
          idempotencyKey: `test-${tpl.templateName}-${Date.now()}`,
        },
      });
      if (error) throw error;
      toast.success(`Test email sent to ${user.email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email.");
    } finally {
      setSendingTest(false);
    }
  };

  if (rolesLoading || isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          You need admin access to preview app emails.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground font-medium mb-2">{templates.length} templates</p>
        {templates.map((tpl) => (
          <button
            key={tpl.templateName}
            onClick={() => setSelected(tpl)}
            className={`w-full text-left bg-card rounded-xl border p-4 transition-all hover:shadow-md active:scale-[0.99] ${
              selected?.templateName === tpl.templateName ? "border-primary shadow-md" : "border-border shadow-sm"
            }`}
          >
            <p className="text-sm font-semibold text-foreground">{tpl.displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{tpl.subject || "—"}</p>
            <Badge variant="secondary" className={`mt-2 text-[0.6rem] ${
              tpl.status === "ready" ? "bg-emerald-100 text-emerald-800" :
              tpl.status === "render_failed" ? "bg-red-100 text-red-800" :
              "bg-amber-100 text-amber-800"
            }`}>
              {tpl.status === "ready" ? "Ready" : tpl.status === "render_failed" ? "Error" : "No preview data"}
            </Badge>
          </button>
        ))}
      </div>
      <div className="lg:col-span-2">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selected.displayName}</h3>
                <p className="text-xs text-muted-foreground">Subject: {selected.subject || "—"}</p>
              </div>
              {selected.status === "ready" && (
                <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1.5" disabled={sendingTest} onClick={() => handleSendTest(selected)}>
                  {sendingTest ? <Loader2 className="h-3 w-3 animate-spin" /> : <SendHorizonal className="h-3 w-3" />}
                  Send Test
                </Button>
              )}
            </div>
            {selected.status === "ready" ? (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <iframe
                  srcDoc={selected.html}
                  sandbox=""
                  className="w-full min-h-[600px] border-0"
                  title={`Preview: ${selected.displayName}`}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {selected.status === "render_failed"
                    ? `Render error: ${selected.errorMessage}`
                    : "This template has no preview data configured."}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-3 opacity-30" />
              Select a template to preview
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-lg font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
