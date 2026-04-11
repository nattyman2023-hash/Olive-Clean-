import { useEffect, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
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
import QuotesTab from "@/components/admin/QuotesTab";
import RecentUploads from "@/components/admin/RecentUploads";
import ServicesManager from "@/components/admin/ServicesManager";
import LeadsTab from "@/components/admin/LeadsTab";
import PermissionsManager from "@/components/admin/PermissionsManager";
import EmailsTab from "@/components/admin/EmailsTab";
import NotificationBell from "@/components/NotificationBell";
import LowStockWidget from "@/components/admin/LowStockWidget";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";
import ImpersonationBar from "@/components/admin/ImpersonationBar";
import oliveLogo from "@/assets/olive-clean-logo.png";

function AdminGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <Lock className="h-8 w-8 opacity-40" />
      <p className="text-sm font-medium">Access restricted</p>
      <p className="text-xs">You don't have permission to view this section.</p>
    </div>
  );
}

function renderSection(section: string, canAccess: (s: string) => boolean, canEdit: (s: string) => boolean, isAdmin: boolean) {
  if (!canAccess(section)) return <AdminGate />;
  const editable = canEdit(section);
  const readOnly = !editable;

  const content = (() => {
    switch (section) {
      case "bookings": return <BookingsTab readOnly={readOnly} />;
      case "clients": return <ClientsTab readOnly={readOnly} />;
      case "jobs": return <JobsTab readOnly={readOnly} />;
      case "leads": return <LeadsTab />;
      case "perks": return <PerksTab />;
      case "analytics": return <AnalyticsTab />;
      case "team": return <TeamTab readOnly={readOnly} />;
      case "hiring": return <HiringTab readOnly={readOnly} />;
      case "services": return <ServicesManager />;
      case "routes": return <RoutesTab />;
      case "supplies": return <SuppliesTab readOnly={readOnly} />;
      case "finance": return <FinanceTab readOnly={readOnly} />;
      case "calendar": return <CalendarTab />;
      case "time-off": return <TimeOffManager isAdmin={isAdmin} />;
      case "quotes": return <QuotesTab readOnly={readOnly} />;
      case "photos": return <RecentUploads />;
      case "comms-log": return <EmailsTab />;
      case "permissions": return <PermissionsManager />;
      default: return <BookingsTab readOnly={readOnly} />;
    }
  })();

  return (
    <>
      <ReadOnlyBanner readOnly={readOnly} />
      {content}
    </>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin, isStaff, isAdminAssistant, isCleaner, loading: authLoading, rolesLoading, signOut, isImpersonating, impersonatedRole } = useAuth();
  const { canAccess, canEdit, allowedSections, loading: permsLoading } = usePermissions();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("bookings");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    }
  }, [authLoading, user, navigate]);

  // Allow access if user has any dashboard role or has any permissions
  useEffect(() => {
    if (!authLoading && !rolesLoading && !permsLoading && user && !isAdmin && !isStaff && !isAdminAssistant && !isCleaner && allowedSections.length === 0) {
      toast("You don't have access to this dashboard.");
      navigate("/");
    }
  }, [authLoading, rolesLoading, permsLoading, user, isAdmin, isStaff, isAdminAssistant, isCleaner, allowedSections, navigate]);

  if (authLoading || rolesLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isStaff && !isAdminAssistant)) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <SEOHead title="Admin Dashboard — Olive Clean" description="Olive Clean admin management dashboard." noindex />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            canAccess={canAccess}
            isAdmin={isImpersonating ? false : isAdmin}
          />

          <div className="flex-1 flex flex-col min-w-0">
            <ImpersonationBar />
            <header className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="shrink-0" />
                <img src={oliveLogo} alt="Olive Clean" className="h-7 hidden sm:block" />
                <div className="hidden sm:block">
                  <h1 className="text-sm font-semibold text-foreground leading-none">Olive Clean</h1>
                  <p className="text-[0.65rem] text-muted-foreground">Admin Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
                {isAdmin && !isImpersonating && (
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
                {isImpersonating && impersonatedRole && (
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full capitalize">
                    {impersonatedRole.replace(/_/g, " ")}
                  </span>
                )}
                <NotificationBell />
                <Button variant="ghost" size="icon" onClick={signOut} className="active:scale-95 transition-transform">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">
              {isAdmin && !isImpersonating && <LowStockWidget />}
              {renderSection(activeSection, canAccess, canEdit, isImpersonating ? false : isAdmin)}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
