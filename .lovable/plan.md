

## Admin Dashboard: Collapsible Sidebar with Grouped Navigation

### Problem
16 flat tabs in a horizontal scrollable bar — impossible on mobile, overwhelming on desktop.

### Solution
Replace the tab bar with a **Shadcn Sidebar** using collapsible groups. On desktop it's a persistent left sidebar; on mobile it collapses to a hamburger menu via `SidebarTrigger`.

### Navigation Groups (with icons)

| Group | Icon | Items |
|-------|------|-------|
| **Operations** | `CalendarDays` | Bookings, Jobs, Calendar, Routes |
| **Customers** | `Users` | Leads, Clients, Perks |
| **Team** | `UserCog` | Team, Hiring, Time Off |
| **Management** | `BarChart3` | Finance, Analytics, Services, Supplies |
| **Assets** | `FolderOpen` | Emails, Photos |

### How It Works

- Each group is a collapsible `SidebarGroup` with an icon and label
- Clicking a group item sets the active "tab" via React state (same as current tab system, just driven by sidebar clicks instead)
- The main content area renders the selected component (no change to existing tab content components)
- `SidebarProvider` wraps the dashboard; `SidebarTrigger` lives in the header for mobile toggle
- On mobile (`collapsible="offcanvas"`), the sidebar slides in as an overlay
- Staff users only see Operations items (Bookings, Jobs); admin-only items show a lock icon or are hidden for non-admins
- The `LowStockWidget` remains at the top of the content area

### Files

| File | Action |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | **Create** — new sidebar component with 5 grouped sections |
| `src/pages/AdminDashboard.tsx` | **Rewrite** — replace Tabs layout with SidebarProvider + content area driven by state |

### Key Implementation Details

- Use existing `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` from `@/components/ui/sidebar`
- Active item highlighted; clicking sets `activeSection` state
- All existing tab content components (`BookingsTab`, `JobsTab`, etc.) are rendered conditionally based on `activeSection` — zero changes to those components
- Header stays at the top with logo, user info, notification bell, and logout
- `SidebarTrigger` added to header for mobile hamburger

