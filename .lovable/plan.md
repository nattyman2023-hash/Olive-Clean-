

# Plan: Enhanced Routes Tab + Supply Tracking + Admin Nav Stability

## 1. Enhanced Routes Tab — Geographic Clustering and Predictive Routing

Upgrade `src/components/admin/RoutesTab.tsx` with:

- **Skill-based constraint badges**: Show technician certifications on each tech group header (pulled from `employees.certifications`), flag mismatches when a job requires a cert the tech doesn't have
- **Route efficiency metrics per technician**: Utilization percentage (work time vs total time including drive), idle gap detection between jobs
- **Neighborhood clustering view**: Toggle between "by technician" and "by zone" grouping — zone view clusters all jobs in a neighborhood regardless of tech assignment, helping admins spot rebalancing opportunities
- **Priority client indicator**: Badge on job cards for clients with a `priority` flag in their `preferences` JSONB (for "Emergency Request" high-priority clients)
- **Drag-and-drop reorder**: Allow reordering jobs within a technician's route, saving the new sequence by updating `scheduled_at` timestamps

## 2. New: Supply & Equipment Tracking

### Database Migration
- New `supply_items` table:
  - `id`, `name`, `category` (cleaning_supply, equipment), `current_stock`, `reorder_threshold`, `unit`, `last_restocked_at`, `notes`, `created_at`
- New `supply_usage_logs` table:
  - `id`, `supply_item_id` (FK), `employee_id` (FK nullable), `quantity_used`, `logged_at`, `job_id` (FK nullable)
- RLS: Admin full access, staff can insert usage logs and view items

### Admin UI — New "Supplies" Tab
- `src/components/admin/SuppliesTab.tsx`:
  - Inventory list with stock levels and color-coded status (green/amber/red based on threshold)
  - "Low Stock" alert banner when any item falls below threshold
  - Usage trend sparklines per item (last 30 days from `supply_usage_logs`)
  - Add/edit supply items dialog
  - Log usage form (select item, quantity, optional employee/job)
- Add tab to `AdminDashboard.tsx`

## 3. Admin Nav Stability (final fix)

The current implementation already has `rolesLoading` and skeleton loaders. The remaining issue is that all 8 tabs show in the `TabsList` but the `ScrollArea` may clip on narrow viewports. Fix:

- Ensure `TabsList` uses `w-max min-w-full` so it never wraps/clips
- Add `overflow-x-auto` fallback styling

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/RoutesTab.tsx` | Skill badges, zone grouping toggle, drag-reorder, priority indicators, efficiency metrics |
| `src/components/admin/SuppliesTab.tsx` | New — inventory management + usage tracking |
| `src/pages/AdminDashboard.tsx` | Add Supplies tab, ensure nav scrolling |
| Migration SQL | `supply_items` + `supply_usage_logs` tables with RLS |

