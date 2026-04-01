

# Admin Alerts for Employee Reports & Reward Redemptions

## Problem
Two gaps exist:
1. **Employee reports** (low stock, supply requests) arrive silently — admins must manually navigate to the Supplies tab to notice them. The `LowStockWidget` banner exists but there's no push notification.
2. **Client reward redemptions** (free cleaning, complimentary dusting) update the `loyalty_milestones` table silently. Admins have no notification and no quick path to create a job for the redeemed reward.

## Solution

### 1. Auto-generate admin notifications on key events

Create a database trigger function that fires on specific table changes and inserts rows into the `notifications` table for admin users. This makes events appear instantly in the existing NotificationBell.

**Migration — two triggers:**

- **`supply_requests` INSERT trigger**: When a staff member submits a supply request, insert a `supply_request` notification for all admin users. Title: "[Employee] requested [Item] × [Qty]".

- **`loyalty_milestones` UPDATE trigger** (when `redeemed` changes to `true`): Insert a `reward_redeemed` notification for all admin users. Title: "Reward redeemed: [milestone_type]". Include `member_id` and `milestone_id` in metadata so the admin can act on it.

Both triggers use `SECURITY DEFINER` and query `user_roles` to find admin user IDs.

### 2. "Reward Redeemed" action flow in PerksTab

The NotificationBell already has a `reward_redeemed` type configured with an "Approve" button that navigates to the Perks tab. Enhance the Perks tab to surface unredeemed-but-redeemed milestones (i.e. client clicked redeem but no job exists yet).

**Changes to `src/components/admin/PerksTab.tsx`:**
- Add a "Pending Redemptions" card at the top showing milestones where `redeemed = true` AND `job_id IS NULL`
- Each row shows client name, reward type (free cleaning / complimentary dusting), date redeemed
- "Create Job" button opens a pre-filled job creation flow: service = milestone type, client = linked client, status = draft
- Once job is created, update the milestone's `job_id` to link them

### 3. Low stock notification trigger

**Migration — trigger on `supply_items` UPDATE:**
- When `current_stock` drops to or below `reorder_threshold` (and was previously above), insert a `low_stock` notification for all admin users
- Title: "[Item name] is low (X remaining)"
- This makes the red badge appear on the bell automatically

### 4. Realtime subscription on milestones

**Changes to `src/components/admin/PerksTab.tsx`:**
- Add realtime subscription on `loyalty_milestones` table so the "Pending Redemptions" card updates live when a client redeems

---

## Technical Details

### Database migration (single SQL file)

```text
1. notify_admin_on_supply_request() — trigger function + trigger on supply_requests AFTER INSERT
2. notify_admin_on_reward_redeemed() — trigger function + trigger on loyalty_milestones AFTER UPDATE OF redeemed
3. notify_admin_on_low_stock() — trigger function + trigger on supply_items AFTER UPDATE OF current_stock
4. ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_milestones (for realtime)
```

All trigger functions: `SECURITY DEFINER`, `SET search_path = public`, query `user_roles WHERE role = 'admin'` to get admin user IDs, then INSERT into `notifications`.

### Files changed

| File | Change |
|---|---|
| Migration SQL | 3 trigger functions + 3 triggers + realtime |
| `src/components/admin/PerksTab.tsx` | Pending Redemptions card + "Create Job" action + realtime sub |
| `src/components/admin/JobsTab.tsx` | Minor: accept pre-fill params via URL search params or shared state |

