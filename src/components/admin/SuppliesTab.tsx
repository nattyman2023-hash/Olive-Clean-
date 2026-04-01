import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, AlertTriangle, Package, TrendingDown, Inbox, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SupplyItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  reorder_threshold: number;
  unit: string;
  last_restocked_at: string | null;
  notes: string | null;
  created_at: string;
}

interface UsageLog {
  id: string;
  supply_item_id: string;
  quantity_used: number;
  logged_at: string;
}

export default function SuppliesTab() {
  const [addOpen, setAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["supply-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supply_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as SupplyItem[];
    },
  });

  const { data: recentUsage = [] } = useQuery({
    queryKey: ["supply-usage-30d"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("supply_usage_logs")
        .select("id, supply_item_id, quantity_used, logged_at")
        .gte("logged_at", thirtyDaysAgo)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data as UsageLog[];
    },
  });

  const lowStockItems = items.filter((i) => i.current_stock <= i.reorder_threshold);

  const usageByItem = recentUsage.reduce<Record<string, number>>((acc, log) => {
    acc[log.supply_item_id] = (acc[log.supply_item_id] || 0) + log.quantity_used;
    return acc;
  }, {});

  const addItemMutation = useMutation({
    mutationFn: async (item: { name: string; category: string; current_stock: number; reorder_threshold: number; unit: string }) => {
      const { error } = await supabase.from("supply_items").insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supply-items"] });
      setAddOpen(false);
      toast({ title: "Item added" });
    },
  });

  const logUsageMutation = useMutation({
    mutationFn: async (log: { supply_item_id: string; quantity_used: number }) => {
      const { error: logError } = await supabase.from("supply_usage_logs").insert(log);
      if (logError) throw logError;
      // Decrement stock
      const item = items.find((i) => i.id === log.supply_item_id);
      if (item) {
        const { error: updateError } = await supabase
          .from("supply_items")
          .update({ current_stock: Math.max(0, item.current_stock - log.quantity_used) })
          .eq("id", log.supply_item_id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supply-items"] });
      queryClient.invalidateQueries({ queryKey: ["supply-usage-30d"] });
      setLogOpen(false);
      toast({ title: "Usage logged" });
    },
  });

  function stockStatus(item: SupplyItem) {
    if (item.current_stock <= 0) return { label: "Out", class: "bg-destructive text-destructive-foreground" };
    if (item.current_stock <= item.reorder_threshold) return { label: "Low", class: "bg-amber-100 text-amber-800 border-amber-200" };
    return { label: "OK", class: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Supplies & Equipment</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex gap-2">
          <LogUsageDialog
            open={logOpen}
            onOpenChange={setLogOpen}
            items={items}
            onSubmit={(data) => logUsageMutation.mutate(data)}
            loading={logUsageMutation.isPending}
          />
          <AddItemDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            onSubmit={(data) => addItemMutation.mutate(data)}
            loading={addItemMutation.isPending}
          />
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Low Stock Alert</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lowStockItems.map((i) => i.name).join(", ")} — below reorder threshold.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No supplies tracked yet. Add your first item.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead className="text-right">30d Usage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const status = stockStatus(item);
                const usage30d = usageByItem[item.id] || 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.category.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.current_stock} {item.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {item.reorder_threshold}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {usage30d > 0 && (
                        <span className="flex items-center justify-end gap-1 text-muted-foreground">
                          <TrendingDown className="h-3 w-3" />{usage30d}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.class} text-[0.65rem] px-2 py-0.5`}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Staff Supply Requests */}
      <StaffSupplyRequests items={items} />
    </div>
  );
}

// --- Dialogs ---

function AddItemDialog({ open, onOpenChange, onSubmit, loading }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; category: string; current_stock: number; reorder_threshold: number; unit: string }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("cleaning_supply");
  const [stock, setStock] = useState("0");
  const [threshold, setThreshold] = useState("5");
  const [unit, setUnit] = useState("units");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl">
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Supply Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. All-Purpose Cleaner" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cleaning_supply">Cleaning Supply</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Stock</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div>
              <Label>Threshold</Label>
              <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bottles" />
            </div>
          </div>
          <Button
            onClick={() => onSubmit({ name, category, current_stock: Number(stock), reorder_threshold: Number(threshold), unit })}
            disabled={!name || loading}
            className="w-full rounded-xl"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogUsageDialog({ open, onOpenChange, items, onSubmit, loading }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SupplyItem[];
  onSubmit: (data: { supply_item_id: string; quantity_used: number }) => void;
  loading: boolean;
}) {
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl">
          <TrendingDown className="h-4 w-4 mr-1" /> Log Usage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Supply Usage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity Used</Label>
            <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <Button
            onClick={() => onSubmit({ supply_item_id: itemId, quantity_used: Number(qty) })}
            disabled={!itemId || loading}
            className="w-full rounded-xl"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Log Usage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StaffSupplyRequests({ items }: { items: SupplyItem[] }) {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin_supply_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supply_requests" as any)
        .select("*, supply_items(name), employees(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("supply_requests" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_supply_requests"] });
      toast({ title: "Request updated" });
    },
  });

  const pending = requests.filter((r: any) => r.status === "pending");

  const statusBadge: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    fulfilled: "bg-blue-100 text-blue-800 border-blue-200",
    denied: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" /> Staff Requests
            {pending.length > 0 && (
              <Badge variant="destructive" className="text-[0.6rem] px-1.5 py-0">{pending.length}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No supply requests from staff yet.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {(r.employees as any)?.name || "Staff"} — {(r.supply_items as any)?.name || "Item"} × {r.quantity}
                  </p>
                  {r.notes && <p className="text-[0.65rem] text-muted-foreground">{r.notes}</p>}
                  <p className="text-[0.6rem] text-muted-foreground mt-0.5">{format(new Date(r.created_at), "MMM d, h:mm a")}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className={`text-[0.6rem] px-1.5 py-0 ${statusBadge[r.status] || ""}`}>{r.status}</Badge>
                  {r.status === "pending" && (
                    <>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateMutation.mutate({ id: r.id, status: "approved" })}>
                        <Check className="h-3 w-3 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateMutation.mutate({ id: r.id, status: "denied" })}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
