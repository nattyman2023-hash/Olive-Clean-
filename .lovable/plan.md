

# Actionable Notifications, Services Manager, Low Stock Widget, and Payslip Preview

## Overview
Four areas of work: (1) Enhanced notification bell with action buttons, (2) Services/Job Templates manager, (3) Low stock dashboard widget + realtime supply alerts, (4) Payslip preview with edit mode. Also clarifying that the client "View Portal" button already exists — it only appears when a client has a linked user account (`client_user_id`).

## Regarding "View Portal" for Clients
The button already exists in `ClientsTab.tsx` (line 381-394). It only renders when `selected.client_user_id` is not null. Clients without a linked auth account won't show it. This is correct — you can't impersonate a user that doesn't exist. No code change needed here.

---

## 1. Actionable Notification Bell

Currently notifications are display-only. Add action buttons per notification type.

### Changes to `src/components/NotificationBell.tsx`
- Expand `TYPE_CONFIG` with new types: `low_stock`, `estimate_accepted`, `reward_redeemed`, `clock_in`
- Add an `action` config per type mapping to a label + navigation route:
  - `low_stock` → "Acknowledge" button (marks read)
  - `estimate_accepted` → "Create Job" button (navigates to Jobs tab)
  - `reward_redeemed` → "Approve Reward" button (navigates to Perks tab)
  - `supply_request` → "Review" button (navigates to Supplies tab)
- Priority-based badge colors: red for high (low_stock), blue for medium (estimate_accepted, reward_redeemed), gray for low (clock_in)
- Each notification row gets an optional action button that navigates + marks read

---

## 2. Services Manager (Job Templates)

New admin tab section for defining reusable job templates with visibility control.

### Database Migration
- New table `service_templates`:
  - `id` (uuid, PK)
  - `name` (text, not null) — e.g. "Deep Clean"
  - `description` (text, nullable)
  - `show_on_portal` (boolean, default false) — visibility toggle
  - `checklist_items` (jsonb, default '[]') — array of task strings
  - `default_duration_minutes` (integer, nullable)
  - `default_price` (numeric, nullable)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz, default now())
- RLS: Admin full access; authenticated clients can SELECT where `show_on_portal = true AND is_active = true`

### New file: `src/components/admin/ServicesManager.tsx`
- List of service templates with name, portal visibility toggle (Switch), checklist item count
- Add/Edit dialog: name, description, visibility switch, checklist items (add/remove text inputs), default duration, default price
- Delete with confirmation

### Changes to `src/pages/AdminDashboard.tsx`
- Add "Services" tab to `ADMIN_TABS` (adminOnly)
- Render `ServicesManager` in that tab

### Changes to `src/components/admin/JobsTab.tsx`
- Replace hardcoded `SERVICES` array with data from `service_templates` query
- When creating a job from a template, auto-fill checklist_state from template's checklist_items

### Changes to `src/components/client/BookingSection.tsx`
- Fetch `service_templates` where `show_on_portal = true` to populate service choices

---

## 3. Low Stock Dashboard Widget + Realtime Alerts

### Changes to `src/pages/AdminDashboard.tsx`
- Add a `LowStockWidget` component rendered above the tabs
- Queries `supply_items` where `current_stock <= reorder_threshold`
- Red card: "X Low Stock Alerts" — clicking navigates to Supplies tab
- Subscribe to realtime on `supply_items` for live updates

### Changes to `src/components/admin/SuppliesTab.tsx`
- Add realtime subscription on `supply_requests` table to auto-refresh when staff submit requests (fixing "silent" reports)
- Add realtime subscription on `supply_items` for stock changes

---

## 4. Payslip Preview with Edit Mode

### Changes to `src/components/admin/finance/PayslipsSection.tsx`
- Add `editMode` toggle (pencil icon) in the preview view
- When editing: hours_worked, hourly_rate, custom_amount, notes become `<Input>` fields
- Auto-recalculate: calculated_amount = hours * rate, net_pay = custom_amount ?? calculated_amount
- "Save" button updates the payslip in database
- Add Olive Clean logo + business details header to preview (matching invoice style)
- Add "View" (Eye) and "Edit" (Pencil) buttons on each payslip row in the list

---

## Implementation Order
1. Migration: `service_templates` table + RLS
2. Payslip preview edit mode (`PayslipsSection.tsx`)
3. Actionable notifications (`NotificationBell.tsx`)
4. Services Manager (`ServicesManager.tsx` + `AdminDashboard.tsx` + `JobsTab.tsx`)
5. Low Stock Widget + realtime subscriptions

## Files Summary
| File | Action |
|---|---|
| Migration SQL | New `service_templates` table |
| `src/components/NotificationBell.tsx` | Action buttons, new types, priority colors |
| `src/components/admin/ServicesManager.tsx` | New: job templates CRUD |
| `src/pages/AdminDashboard.tsx` | Add Services tab + Low Stock Widget |
| `src/components/admin/JobsTab.tsx` | Use service_templates for service dropdown |
| `src/components/admin/SuppliesTab.tsx` | Realtime subscriptions |
| `src/components/admin/finance/PayslipsSection.tsx` | Edit mode + professional preview |

