import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Loader2 } from "lucide-react";
import BookingsTab from "@/components/admin/BookingsTab";
import ClientsTab from "@/components/admin/ClientsTab";
import JobsTab from "@/components/admin/JobsTab";
import PerksTab from "@/components/admin/PerksTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import TeamTab from "@/components/admin/TeamTab";
import HiringTab from "@/components/admin/HiringTab";
import RoutesTab from "@/components/admin/RoutesTab";

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">O</span>
          </div>
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
          <Button variant="ghost" size="icon" onClick={signOut} className="active:scale-95 transition-transform">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-6xl">
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="bg-card border border-border rounded-xl p-1 h-auto">
            <TabsTrigger value="bookings" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Bookings
            </TabsTrigger>
            <TabsTrigger value="clients" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Clients
            </TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Jobs
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="perks" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Perks
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="analytics" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Analytics
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="team" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Team
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="hiring" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Hiring
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="routes" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Routes
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="bookings">
            <BookingsTab />
          </TabsContent>
          <TabsContent value="clients">
            <ClientsTab />
          </TabsContent>
          <TabsContent value="jobs">
            <JobsTab />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="perks">
              <PerksTab />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="analytics">
              <AnalyticsTab />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="team">
              <TeamTab />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="hiring">
              <HiringTab />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="routes">
              <RoutesTab />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
