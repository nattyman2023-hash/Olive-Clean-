## Goal

Three improvements to the Jobs experience:

1. **Editable job drawer** — currently the drawer only lets you change status and reassign. Add inline editing for date/time, duration, price, service, and notes.
2. **Audit-log timeline** — a dedicated, read-only history strip showing every status change with previous status → new status, reason, actor, and timestamp.
3. **Notification read-receipts** — track and show when an admin first opened each job notification (separate from "marked as read"), so other admins can see "Seen by Jane · 2:14 PM".

---

## 1. Editable Job Drawer

**Where:** `src/components/admin/JobsTab.tsx` → `JobDetailPanel`.

Today the "Scheduled / Duration / Price / Notes" block is plain read-only text. There is no edit affordance.

**Change:** Replace the static block with an inline edit panel:

- Add an "Edit" pencil button next to the section header. Clicking flips the block into edit mode with these fields:
  - **Scheduled date & time** — `<Input type="datetime-local">`
  - **Service** — `<select>` populated from `serviceTemplates` (same options as Create form)
  - **Estimated duration (min)** — number input
  - **Price ($)** — number input
  - **Notes** — `<Textarea>`
- "Save" button calls `supabase.from("jobs").update({...}).eq("id", job.id)`, then refetches and toasts. "Cancel" reverts.
- New helper `updateJobFields(id, patch)` lives alongside `updateJobStatus` and is passed into `JobDetailPanel` like the other handlers.
- After save, also write a `crm_notes` row of `note_type: "job_edit"` summarizing what changed (e.g. "Scheduled: Apr 30 10:00 AM → May 2 2:00 PM (by admin@...)") so it shows up in the audit timeline.
- Read-only mode (when `readOnly` prop is set) hides the Edit button entirely.

**Why this fixes the user's complaint:** "There is no option to edit or add a date on the jobs" — they currently can only reschedule by deleting and recreating. The edit affordance restores parity with the Create form.

---

## 2. Audit-Log Timeline

**New component:** `src/components/admin/jobs/JobAuditLog.tsx`.

Reads from the existing `crm_notes` table where `parent_type = 'job'` and `parent_id = job.id`, filtered to `note_type IN ('status_change', 'job_edit', 'system')`.

- Renders a vertical timeline (dot + line + card per entry), newest first.
- Each entry shows:
  - **Timestamp** — formatted "Apr 29 · 2:14 PM"
  - **Previous → New status pills** when the note is a `status_change` (parsed from the `content` string we already write, e.g. `Status: scheduled → completed (by admin@…) — Reason: …`). We'll switch the `updateJobStatus` writer to also persist a structured `metadata` JSON column? — No, `crm_notes` has no metadata column. Instead we'll **regex-parse** the existing content format we already write in `JobsTab.tsx` line 264. The format is stable.
  - **Actor** — extracted from the `(by …)` segment.
  - **Reason** — extracted from the `Reason: …` segment when present.
- Empty state: "No status changes recorded yet."

**Where mounted:** Inside `JobDetailPanel`, just above the "Update Status" section, in its own collapsible card titled "Status History".

**Why a separate component from `ActivityTimeline`:** ActivityTimeline mixes free-form notes/tasks. The audit log is curated to status transitions and edits, which is what the user asked to see in chronological form.

---

## 3. Notification Read-Receipts (Opened/Seen indicator)

**Schema migration** (`supabase/migrations/…`):

```sql
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_by uuid;

-- Allow any admin/staff to record that *they* opened a notification,
-- even if it was originally addressed to a different admin.
CREATE POLICY "Admins can record notification opens"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Admins/staff can see receipt fields on each other's notifications
CREATE POLICY "Admins can view all notifications for receipts"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
```

**`NotificationBell.tsx` changes:**

- When an item is clicked (handler at line ~112), in addition to `markReadMutation`, fire a one-shot `supabase.from("notifications").update({ opened_at: new Date().toISOString(), opened_by: currentUserId }).eq("id", id).is("opened_at", null)` — only stamps the **first** open.
- For each notification card, fetch the `opened_at`/`opened_by` and (if set and `opened_by !== current user`) render a small footer line:
  > 👁 Seen by **Jane Doe** · Apr 29, 2:14 PM
- Resolve the opener name by joining via the existing `profiles` table (display_name, user_id). One lookup per render — fine for a notification list of ~10–20 items.

**Toast/UI for the originating admin:** When *another* admin opens a job notification you sent, no realtime push is required for v1 — the receipt just appears the next time you open the bell. (Realtime can be a follow-up if desired.)

---

## Files

**New**
- `src/components/admin/jobs/JobAuditLog.tsx`
- `supabase/migrations/<timestamp>_notification_receipts.sql`

**Edited**
- `src/components/admin/JobsTab.tsx` — add `updateJobFields`, edit-mode UI in `JobDetailPanel`, mount `JobAuditLog`, log edits to `crm_notes`.
- `src/components/NotificationBell.tsx` — stamp `opened_at` on first click, render "Seen by …" footer, resolve names from `profiles`.

## Notes

- Status-change parsing relies on the exact format already written today (`Status: X → Y (by Z) — Reason: R`); confirmed at `JobsTab.tsx:264`.
- The "edit" path sends a `job-update` email only when status changes (existing behavior). Field-only edits stay silent so we don't spam clients on every typo fix.
- Read-receipt timestamps remain server-driven (`new Date().toISOString()` from client is fine; no DB default trigger needed).
