import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, DollarSign, CreditCard, Receipt, LogOut } from "lucide-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import ExpensesSection from "@/components/admin/finance/ExpensesSection";
import PayoutsSection from "@/components/admin/finance/PayoutsSection";

// ── Types ────────────────────────────────────────────────────

interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  customer_name: string | null;
  customer_email: string | null;
  tip_amount: number | null;
}

// ── Customer Payments Tab ────────────────────────────────────

function CustomerPaymentsTab() {
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<StripePayment | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list-stripe-payments", {
          body: null,
          method: "GET",
        });
        if (error) throw error;
        setPayments(data?.payments || []);
      } catch {
        toast.error("Failed to load payments.");
      }
      setLoading(false);
    })();
  }, []);

  const openDetail = (p: StripePayment) => {
    setSelectedPayment(p);
    setSheetOpen(true);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <>
      {payments.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No recent payments found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tip</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const failed = ["canceled", "requires_payment_method"].includes(p.status);
                return (
                  <TableRow
                    key={p.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${failed ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                    onClick={() => openDetail(p)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.customer_email || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ${(p.amount / 100).toFixed(2)} <span className="text-xs text-muted-foreground uppercase">{p.currency}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.tip_amount ? `$${p.tip_amount.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(p.created * 1000), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.id}</TableCell>
                    <TableCell>
                      <Badge
                        variant={failed ? "destructive" : p.status === "succeeded" ? "default" : "secondary"}
                        className={`text-[0.65rem] ${p.status === "succeeded" ? "bg-emerald-600 text-white" : ""}`}
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Payment Detail Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Payment Detail</SheetTitle>
            <SheetDescription>Transaction breakdown</SheetDescription>
          </SheetHeader>

          {selectedPayment && (
            <div className="space-y-5 mt-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="text-2xl font-bold text-foreground">
                  ${(selectedPayment.amount / 100).toFixed(2)}{" "}
                  <span className="text-sm text-muted-foreground uppercase">{selectedPayment.currency}</span>
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium text-foreground">{selectedPayment.customer_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{selectedPayment.customer_email || "—"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm text-foreground">{format(new Date(selectedPayment.created * 1000), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      variant={selectedPayment.status === "succeeded" ? "default" : "secondary"}
                      className={`mt-1 text-[0.65rem] ${selectedPayment.status === "succeeded" ? "bg-emerald-600 text-white" : ""}`}
                    >
                      {selectedPayment.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <p className="text-xs font-mono text-foreground break-all">{selectedPayment.id}</p>
                </div>
                {selectedPayment.tip_amount && selectedPayment.tip_amount > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tip</p>
                    <p className="text-sm font-medium text-emerald-600">${selectedPayment.tip_amount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Main Dashboard ───────────────────────────────────────────

export default function FinanceDashboard() {
  const { user, loading, rolesLoading, isAdmin, isFinance } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !rolesLoading) {
      if (!user || (!isAdmin && !isFinance)) {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, rolesLoading, isAdmin, isFinance, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading || rolesLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user || (!isAdmin && !isFinance)) return null;

  const initials = (user.email || "U").slice(0, 2).toUpperCase();
  const roleBadge = isAdmin ? "ADMIN" : "FINANCE";

  return (
    <div className="min-h-screen bg-background">
      {/* Auth Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">Olive Clean</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">/ Finance Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[0.65rem] font-semibold px-2 py-0.5 border-primary text-primary">
              {roleBadge}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/reset-password")} className="text-xs cursor-pointer">
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-xs text-destructive cursor-pointer">
                  <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage payouts, customer payments, and expense approvals</p>
        </div>

        <Tabs defaultValue="payouts" className="space-y-4">
          <TabsList className="bg-card border border-border rounded-lg p-1 h-auto">
            <TabsTrigger value="payouts" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />Payouts
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />Customer Payments
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />Expense Approvals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payouts"><PayoutsSection /></TabsContent>
          <TabsContent value="payments"><CustomerPaymentsTab /></TabsContent>
          <TabsContent value="expenses"><ExpensesSection /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
