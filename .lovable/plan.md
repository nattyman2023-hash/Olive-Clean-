

# Shift Trading, Scheduling, Notification Bell, Supply Notifications, and Logo Replacement

## Overview

Five areas of work: (1) shift trade request system with admin approval, (2) mobile-friendly scheduling with color coding and slide-up modals, (3) a notification bell hub, (4) admin visibility into supply requests from staff, and (5) replacing the existing text-based logo with the uploaded Olive Clean logo image across all pages.

---

## 1. Database Migrations

**New table: `shift_trade_requests`**
- `id` uuid PK
- `requester_id` uuid → employees(id)
- `requester_job_id` uuid → jobs(id)
- `target_id` uuid → employees(id) (nullable, for open trades)
- `target_job_id` uuid → jobs(id) (nullable, for swap)
- `status` text: `open`, `accepted`, `pending_admin`, `approved`, `denied`, `cancelled`
- `created_at`, `updated_at` timestamps
- RLS: staff can insert/view own trades, admin full access

**New table: `notifications`**
- `id` uuid PK
- `user_id` uuid (auth user)
- `type` text (`trade_request`, `trade_accepted`, `trade_approved`, `trade_denied`, `supply_request`, `schedule_posted`, `announcement`, `reminder`)
- `title` text
- `body` text
- `metadata` jsonb (links, IDs)
- `read` boolean default false
- `created_at` timestamp
- RLS: users can read/update own notifications, admin can insert for anyone

**Enable realtime** on `notifications` table for live badge count updates.

---

## 2. Logo Replacement

Copy the uploaded `Olive_Clean_Olive_White.png` to `src/assets/olive-clean-logo.png`. Then replace the inline "O" circle + text logo in these files with an `<img>` tag:

| File | Location |
|---|---|
| `src/components/Navbar.tsx` | Lines 28-36 |
| `src/components/Footer.tsx` | Lines 11-18 |
| `src/pages/AdminDashboard.tsx` | Lines 83-89 |
| `src/pages/AdminLogin.tsx` | Lines 47-49 |
| `src/pages/ClientLogin.tsx` | ~line 47 |
| `src/pages/EmployeeLogin.tsx` | ~line 47 |
| `src/pages/ClientDashboard.tsx` | Lines 246-248 (no-client state) and lines 272-274 (header) |
| `src/pages/EmployeeDashboard.tsx` | Lines 148-150 (header) |

Each will import the logo: `import oliveLogo from "@/assets/olive-clean-logo.png"` and render `<img src={oliveLogo} alt="Olive Clean" className="h-8" />`.

---

## 3. Notification Bell Component

**New file: `src/components/NotificationBell.tsx`**

- Queries `notifications` where `user_id = auth.uid()` and `read = false` for badge count
- Subscribes to Supabase Realtime on `notifications` for live updates
- Renders a bell icon with red badge count
- On click, opens a dropdown/popover listing recent notifications with icons and color coding by type:
  - Trade requests: orange
  - Approvals: green
  - Schedule/announcements: blue
  - Reminders: yellow
  - Supply requests: purple
- Clicking a notification marks it as `read`
- "Mark all read" button

**Integration points:**
- Add to `EmployeeDashboard.tsx` header (between Staff badge and logout)
- Add to `AdminDashboard.tsx` header (between Admin badge and logout)

---

## 4. Shift Trading System

**Employee Dashboard additions (`EmployeeDashboard.tsx`):**
- Add a "Request Trade" button on each job card
- Opens a slide-up Sheet modal with:
  - The shift details
  - Option to invite a specific colleague (dropdown of active employees) or leave open
  - Submit creates a `shift_trade_requests` row with status `open`
  - Creates a notification for the target employee (if specified) or all staff

**New file: `src/components/employee/ShiftTradeCard.tsx`**
- Displays incoming trade requests from the notification bell
- "Accept" button: updates trade status to `pending_admin`, creates notification for admin
- "Decline" button: updates status to `cancelled`

**Admin Dashboard (`TeamTab.tsx` or new section):**
- Show pending admin trade requests
- Approve: swaps `assigned_to` on both jobs, updates status to `approved`, notifies both employees
- Deny: updates status to `denied`, notifies both employees

---

## 5. Mobile Scheduling Enhancements (Employee Dashboard)

- **Color coding**: Update the week strip and job cards with service-type colors (morning/AM jobs green, afternoon/PM jobs blue, pending-trade jobs orange)
- **"Me" toggle**: Already effectively in place (employee only sees own jobs), no change needed
- **Slide-up modal**: Replace job card expand/collapse with a Sheet (slide-up from bottom on mobile) containing full details, status buttons, trade button, and checklist

---

## 6. Supply Request Notifications to Admin

When an employee submits a supply request in `SupplyRequestForm`:
- After successful insert, also insert a `notifications` row for all admin users
- Title: "Supply Request from {employee name}"
- Body: "{quantity}x {item name}"
- Type: `supply_request`

**Admin Supplies Tab** (`SuppliesTab.tsx`):
- Add a "Staff Requests" section showing all `supply_requests` with employee name, item, quantity, status
- Admin can approve/fulfill/deny each request

---

## Files Modified/Created

| File | Action |
|---|---|
| Migration SQL | Create `shift_trade_requests`, `notifications` tables + RLS + realtime |
| `src/assets/olive-clean-logo.png` | Copy uploaded logo |
| `src/components/NotificationBell.tsx` | New: bell icon + dropdown |
| `src/components/employee/ShiftTradeCard.tsx` | New: trade accept/decline UI |
| `src/components/Navbar.tsx` | Replace text logo with image |
| `src/components/Footer.tsx` | Replace text logo with image |
| `src/pages/AdminDashboard.tsx` | Replace logo, add notification bell |
| `src/pages/AdminLogin.tsx` | Replace logo |
| `src/pages/ClientLogin.tsx` | Replace logo |
| `src/pages/EmployeeLogin.tsx` | Replace logo |
| `src/pages/ClientDashboard.tsx` | Replace logo (2 spots) |
| `src/pages/EmployeeDashboard.tsx` | Replace logo, add notification bell, add trade button on jobs, use Sheet for job details, color-code jobs |
| `src/components/admin/TeamTab.tsx` | Add trade approval section |
| `src/components/admin/SuppliesTab.tsx` | Add staff requests section |

## Implementation Order

1. Database migration (tables, RLS, realtime)
2. Copy logo asset and replace across all files
3. NotificationBell component
4. Shift trading (employee request + accept + admin approve)
5. Supply request notifications + admin requests view
6. Mobile scheduling polish (color coding, Sheet modals)

