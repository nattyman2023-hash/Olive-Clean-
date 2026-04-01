import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import BookingsTab from "@/components/admin/BookingsTab";
import ClientsTab from "@/components/admin/ClientsTab";
import JobsTab from "@/components/admin/JobsTab";
import PerksTab from "@/components/admin/PerksTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import TeamTab from "@/components/admin/TeamTab";
import HiringTab from "@/components/admin/HiringTab";
import RoutesTab from "@/components/admin/RoutesTab";
import SuppliesTab from "@/components/admin/SuppliesTab";
import FinanceTab from "@/components/admin/FinanceTab";
import CalendarTab from "@/components/admin/CalendarTab";
import TimeOffManager from "@/components/admin/TimeOffManager";
import EmailsTab from "@/components/admin/EmailsTab";
import RecentUploads from "@/components/admin/RecentUploads";
import ServicesManager from "@/components/admin/ServicesManager";
import NotificationBell from "@/components/NotificationBell";
import LowStockWidget from "@/components/admin/LowStockWidget";
import oliveLogo from "@/assets/olive-clean-logo.png";

const ADMIN_TABS = [
  { value: "bookings", label: "Bookings" },
  { value: "clients", label: "Clients" },
  { value: "jobs", label: "Jobs" },
  { value: "perks", label: "Perks", adminOnly: true },
  { value: "analytics", label: "Analytics", adminOnly: true },
  { value: "team", label: "Team", adminOnly: true },
  { value: "hiring", label: "Hiring", adminOnly: true },
  { value: "services", label: "Services", adminOnly: true },
  { value: "routes", label: "Routes", adminOnly: true },
  { value: "supplies", label: "Supplies", adminOnly: true },
  { value: "finance", label: "Finance", adminOnly: true },
  { value: "calendar", label: "Calendar", adminOnly: true },
  { value: "time-off", label: "Time Off", adminOnly: true },
  { value: "emails", label: "Emails", adminOnly: true },
  { value: "photos", label: "Photos", adminOnly: true },
];

function AdminGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <Lock className="h-8 w-8 opacity-40" />
      <p className="text-sm font-medium">Admin access required</p>
      <p className="text-xs">You don't have permission to view this section.</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin, isStaff, loading: authLoading, rolesLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !rolesLoading && user && !isAdmin && !isStaff) {
      toast("You don't have access to this dashboard.");
      navigate("/");
    }
  }, [authLoading, rolesLoading, user, isAdmin, isStaff, navigate]);

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isStaff)) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={oliveLogo} alt="Olive Clean" className="h-8" />
          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">Olive Clean</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
          {isAdmin && (
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={signOut} className="active:scale-95 transition-transform">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-6xl">
        <Tabs defaultValue="bookings" className="space-y-6">
          <ScrollArea className="w-full">
            <TabsList className="bg-card border border-border rounded-xl p-1 h-auto inline-flex w-max min-w-full">
              {ADMIN_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-lg text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="bookings"><BookingsTab /></TabsContent>
          <TabsContent value="clients"><ClientsTab /></TabsContent>
          <TabsContent value="jobs"><JobsTab /></TabsContent>
          <TabsContent value="perks">{isAdmin ? <PerksTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="analytics">{isAdmin ? <AnalyticsTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="team">{isAdmin ? <TeamTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="hiring">{isAdmin ? <HiringTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="routes">{isAdmin ? <RoutesTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="supplies">{isAdmin ? <SuppliesTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="finance">{isAdmin ? <FinanceTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="calendar">{isAdmin ? <CalendarTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="time-off">{isAdmin ? <TimeOffManager isAdmin /> : <AdminGate />}</TabsContent>
          <TabsContent value="emails">{isAdmin ? <EmailsTab /> : <AdminGate />}</TabsContent>
          <TabsContent value="photos">{isAdmin ? <RecentUploads /> : <AdminGate />}</TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
