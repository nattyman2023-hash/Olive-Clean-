

# Phase 4 — Client Self-Service + Phase 5 — Employee Portal Upgrades

## Phase 4: Client Self-Service

### What exists
- Home tab: loyalty status, booking form, upcoming/past jobs, preferences
- Invoices tab, Account tab
- Clients can leave reviews via link to `/feedback/:jobId`

### What we're adding

**A. Cancel/Reschedule Appointments**
- Add a "Cancel" button on upcoming job cards (sets status to `cancelled`)
- Add a "Reschedule" button that opens a date/time picker and updates `scheduled_at`
- RLS: clients already have SELECT on own jobs; need UPDATE policy for `client_user_id` match (limited to `status` and `scheduled_at` columns via a DB function)

**B. Inline Star Rating**
- On past completed jobs without feedback, show clickable stars directly on the card instead of just a "Leave Review" link
- Submit creates a feedback record inline without navigating away

**C. Reward Redemption**
- In `LoyaltyStatus`, show earned milestones with a "Redeem" button
- Clicking marks `loyalty_milestones.redeemed = true`
- Need RLS UPDATE policy for clients on `loyalty_milestones` (own milestones only, redeemed column only)

### Database changes
1. Migration: Add RLS policy on `jobs` allowing clients to update their own jobs' `status` (to `cancelled` only) and `scheduled_at`
2. Migration: Add RLS UPDATE policy on `loyalty_milestones` for clients to mark own milestones as redeemed

### Files
| File | Change |
|---|---|
| Migration | Client update policies for jobs + milestones |
| `src/pages/ClientDashboard.tsx` | Cancel/reschedule buttons on upcoming jobs, inline rating on past jobs |
| `src/components/client/LoyaltyStatus.tsx` | Redeem button on milestones |

---

## Phase 5: Employee Portal Upgrades

### What exists
- Today's jobs with full status flow, checklist, photo uploads, incident reports
- Performance stats, onboarding checklist, certifications
- Expense submission, time-off requests

### What we're adding

**A. Multi-Day Schedule View**
- Add a date picker at the top of the dashboard to browse jobs for any upcoming day (not just today)
- Show a week-at-a-glance strip with job counts per day

**B. Supply Request Form**
- Replace the "Report Incident / Low Supply" free-text with a structured supply request
- Show dropdown of items from `supply_items` table + quantity field
- Insert into `supply_usage_logs` with negative quantity to flag a restock need (or add a new `supply_requests` table)

**C. In-App Messaging (Notes Board)**
- New `team_messages` table for simple admin-to-staff announcements
- Show a "Messages" card on the employee dashboard with recent announcements
- Admin can post messages from a new section in the Team tab

### Database changes
1. Migration: Create `team_messages` table (id, author_id, message, created_at) with RLS (admin insert, staff select)
2. Migration: Create `supply_requests` table (id, employee_id, supply_item_id, quantity, status, created_at) with RLS

### Files
| File | Change |
|---|---|
| Migration | `team_messages` + `supply_requests` tables |
| `src/pages/EmployeeDashboard.tsx` | Date picker for multi-day view, supply request form, messages card |
| `src/components/admin/TeamTab.tsx` | Admin message posting section |

---

## Implementation Order
1. Database migrations (client update policies, `team_messages`, `supply_requests`)
2. Phase 4: Client cancel/reschedule, inline rating, reward redemption
3. Phase 5: Multi-day schedule, supply requests, team messages

