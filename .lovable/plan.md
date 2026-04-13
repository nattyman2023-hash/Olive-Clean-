

## Fix: Lead Drawer Click, Job Notes, Route Job Links, Outreach Hub Logging

Four targeted fixes based on the reported issues.

---

### 1. Lead Row Click → Drawer Not Working

The lead drawer **does** exist and works — clicking the lead **name** opens it. But the entire card row should be clickable, not just the name text. The name button is small and easy to miss.

**Fix in `LeadsTab.tsx`**: Make the entire `Card` clickable (add `onClick={() => setSelectedLead(lead)}` on the Card or its CardContent), keeping the action buttons (Edit, Delete, Create Quote, Convert) with `e.stopPropagation()` so they don't also trigger the drawer.

---

### 2. Add ActivityTimeline + Notes to Job Detail Drawer

The `JobDetailPanel` in `JobsTab.tsx` currently shows job info, photos, attendance, and status actions — but has **no notes/activity section**. The `ActivityTimeline` component (already built and used in LeadsTab) needs to be added here.

**Fix in `JobsTab.tsx`**:
- Import `ActivityTimeline` from `./ActivityTimeline`
- Add it to `JobDetailPanel` after the notes section, using `parentType="job"` and `parentId={job.id}`
- This gives every job a note/task entry form and a timeline of logged calls, notes, and system events
- Update `crm_notes` parent_type to also accept `"job"` (it's just a text field, no migration needed)

---

### 3. Route Job Cards Not Clickable

`RouteJobCard` in `RoutesTab.tsx` is purely drag-and-drop — it has no `onClick` handler. Clicking a job card on the Routes page does nothing.

**Fix**: Two options — either (a) open the Jobs tab with that job selected, or (b) add a Sheet drawer directly in RoutesTab. Option (b) is cleaner — add a `onSelect` callback to `RouteJobCard`, and in `RoutesTab`, open a Sheet with the job details + ActivityTimeline when clicked.

**Files changed**:
- `RouteJobCard.tsx` — Add `onSelect` prop, fire it on click (not on drag)
- `RoutesTab.tsx` — Add state for `selectedRouteJob`, render a Sheet with job info and ActivityTimeline

---

### 4. Outreach Hub — Log Call Not Persisting

The `logCall` mutation in `CallListTab.tsx` inserts into `crm_notes` and updates `outreach_status` on leads. The issue is likely that:
- The mutation doesn't handle errors (no `onError` callback)
- For client-type items, status is only tracked in local React state (lost on refresh)
- The query refetch may not be picking up the status change because `outreach_status` from the DB is overridden by the default `"needs_nudge"` in the query function

**Fix in `CallListTab.tsx`**:
- Add `onError` handler to `logCall` mutation to surface failures
- When building the items list, use the lead's `outreach_status` from the DB (it's already queried but the code hardcodes `outreachStatus: "needs_nudge"` for stale leads instead of reading the saved value)
- Same fix for "Send Nudge Email" — add a mutation that logs the email attempt and updates status

---

### Files Summary

| File | Change |
|------|--------|
| `src/components/admin/LeadsTab.tsx` | Make entire lead card clickable; stopPropagation on action buttons |
| `src/components/admin/JobsTab.tsx` | Add `ActivityTimeline` component to `JobDetailPanel` |
| `src/components/admin/routes/RouteJobCard.tsx` | Add `onSelect` click prop |
| `src/components/admin/RoutesTab.tsx` | Add Sheet drawer for selected route job with ActivityTimeline |
| `src/components/admin/CallListTab.tsx` | Fix outreach status reading from DB; add error handling to mutations |

