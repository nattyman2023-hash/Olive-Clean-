import { useState } from "react";
import {
  Target,
  BookOpen,
  TrendingUp,
  CalendarCheck,
  Briefcase,
  CalendarDays,
  MapPin,
  Camera,
  Users,
  Gift,
  Mail,
  UserCog,
  UserPlus,
  Clock,
  DollarSign,
  Package,
  Wrench,
  Shield,
  ChevronDown,
  Rocket,
  Settings as SettingsIcon,
  Building2,
  HeartHandshake,
  Users2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NavItem {
  value: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Sales & Growth",
    icon: Rocket,
    items: [
      { value: "leads", label: "Leads", icon: Target },
      { value: "quotes", label: "Quotes", icon: BookOpen },
      { value: "analytics", label: "Analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Operations",
    icon: CalendarDays,
    items: [
      { value: "jobs", label: "Jobs", icon: Briefcase },
      { value: "calendar", label: "Calendar", icon: CalendarDays },
      { value: "routes", label: "Routes", icon: MapPin },
      { value: "photos", label: "Photos", icon: Camera },
    ],
  },
  {
    label: "Clients & Retention",
    icon: HeartHandshake,
    items: [
      { value: "clients", label: "Clients", icon: Users },
      { value: "call-list", label: "Call List", icon: Phone },
      { value: "perks", label: "Perks", icon: Gift },
      { value: "comms-log", label: "Comms Log", icon: Mail },
    ],
  },
  {
    label: "Team & HR",
    icon: Users2,
    items: [
      { value: "team", label: "Team", icon: UserCog },
      { value: "hiring", label: "Hiring", icon: UserPlus },
      { value: "time-off", label: "Time Off", icon: Clock },
    ],
  },
  {
    label: "Business Admin",
    icon: Building2,
    items: [
      { value: "finance", label: "Finance", icon: DollarSign },
      { value: "supplies", label: "Supplies", icon: Package },
      { value: "services", label: "Services", icon: Wrench },
      { value: "permissions", label: "Permissions", icon: Shield },
    ],
  },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  canAccess: (section: string) => boolean;
  isAdmin: boolean;
}

export default function AdminSidebar({ activeSection, onSectionChange, canAccess, isAdmin }: AdminSidebarProps) {
  const activeGroupIndex = NAV_GROUPS.findIndex((g) =>
    g.items.some((i) => i.value === activeSection)
  );

  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    NAV_GROUPS.forEach((_, idx) => {
      initial[idx] = idx === activeGroupIndex;
    });
    return initial;
  });

  const toggleGroup = (idx: number) => {
    setOpenGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarContent className="pt-2">
        {NAV_GROUPS.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) => canAccess(item.value));
          if (visibleItems.length === 0) return null;

          return (
            <Collapsible
              key={group.label}
              open={openGroups[gIdx] ?? false}
              onOpenChange={() => toggleGroup(gIdx)}
            >
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                    <span className="flex items-center gap-2">
                      <group.icon className="h-4 w-4" />
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        openGroups[gIdx] && "rotate-180"
                      )}
                    />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
                        const isActive = activeSection === item.value;
                        return (
                          <SidebarMenuItem key={item.value}>
                            <SidebarMenuButton
                              onClick={() => onSectionChange(item.value)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                                isActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="flex-1">{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
