

## Drawer Standard, Boomerang Logic, Outreach Hub, and Admin Chat Fix

### What's Changing

Four interconnected upgrades to unify the admin UX and add lifecycle intelligence.

---

### 1. Drawer Standard (Global)

**LeadsTab** already uses a Sheet (right drawer) -- good. **JobsTab** currently uses an inline detail panel on desktop and a bottom Drawer on mobile. We'll switch both to a **right Sheet** so clicking a job row slides in a scrollable detail panel from the right, and the list stays interactive behind it.

| File | Change |
|------|--------|
| `src/components/admin/JobsTab.tsx` | Replace the inline `JobDetailPanel` (desktop) and bottom `Drawer` (mobile) with a single `Sheet` from the right. The Sheet content will contain all existing detail sections (assignment, schedule, photos, attendance, feedback, status actions) inside a scrollable container. Remove the `isDesktop` split logic for detail rendering. |
| `src/components/admin/LeadsTab.tsx` | Remove the standalone Eye icon button from the actions row -- clicking the lead name already opens the Sheet. Keep edit/delete icon buttons. |

---

### 2. Boomerang Lead Lifecycle

When a lead becomes a scheduled job, hide it from Leads. If that job is cancelled, the lead reappears.

| File | Change |
|------|--------|
| `src/components/admin/LeadsTab.tsx` | Add `"archived"` to status options. Filter out leads with `status = "scheduled"` from the default list view (they live in Jobs now). Add an "Archive" button to the Sheet drawer. |
| `src/components/admin/JobsTab.tsx` | When a job status is changed to `cancelled`: look up `leads` where `converted_job_id = job.id`, and update that lead's status back to `"new"`. Add a system `crm_notes` entry: "Job cancelled -- lead returned to pipeline." |
| `src/components/admin/LeadsTab.tsx` | Add `"archived"` to the status filter dropdown so admins can view archived leads. Add status colors for archived. |

---

### 3. Rename Call List to "Outreach Hub"

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Rename "Call List" label to "Outreach Hub" (keep value `"call-list"`). |
| `src/components/admin/CallListTab.tsx` | Rename header. Add a simple column-based layout with 4 status columns: "Needs Nudge", "Attempted", "Speaking", "Won Back". Each card shows name, phone, reason tag. Clicking a card opens a Sheet with the client/lead history and ActivityTimeline + notes. Add a "Log Call" button that creates a `crm_notes` entry and moves the card to "Attempted". |

This requires a new `outreach_status` field. Rather than a migration, we'll track this in `crm_notes` with a system note approach -- or simpler: add a lightweight `outreach_status` column to `leads` and use `crm_notes.is_task` status for clients.

**Database migration**: Add `outreach_status` column to `leads` table (text, nullable, default null). Values: `needs_nudge`, `attempted`, `speaking`, `won_back`. For lost clients, we'll use a local state mapping since they don't have a leads record.

---

### 4. Hide Chat Widget for Admins

| File | Change |
|------|--------|
| `src/App.tsx` | Wrap `<ChatWidget />` so it only renders when the current route is NOT `/admin`. Use `useLocation` to check. |

No separate "Messages" page needed yet -- the Comms Log already serves as the admin inbox for email communications, and lead chat transcripts are visible in the Lead Sheet.

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/JobsTab.tsx` | Replace inline detail + bottom Drawer with right Sheet; add boomerang logic on cancel |
| `src/components/admin/LeadsTab.tsx` | Remove Eye icon; add "archived" status; filter out "scheduled" leads; add Archive button |
| `src/components/admin/AdminSidebar.tsx` | Rename "Call List" to "Outreach Hub" |
| `src/components/admin/CallListTab.tsx` | Rebuild as column-based Outreach Hub with Sheet detail and status tracking |
| `src/App.tsx` | Hide ChatWidget on `/admin` routes |
| Database migration | Add `outreach_status` column to `leads` |

