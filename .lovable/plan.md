## 1. Notification Bell — show previous status, reason, and deep link

Update `src/components/NotificationBell.tsx`:

- Register the new `job_*` notification types in `TYPE_CONFIG` (`job_in_progress`, `job_completed`, `job_cancelled`, `job_scheduled`) with appropriate icon/color and `actionLabel: "Open Job"`, `actionTab: "jobs"`.
- Render a small badge row under the body for `job_*` types showing `previous_status → new_status` (pulled from `metadata.previous_status` / `metadata.new_status`) using the same color tokens as the Jobs tab status pills.
- If `metadata.reason` is present (cancellations), render it on its own muted line: `Reason: …`.
- Update `handleAction` so when a notification has `metadata.job_id`, it stores the target job id (e.g. `sessionStorage.setItem("openJobId", id)`) before switching tabs. JobsTab will pick it up and open the drawer.

## 2. JobsTab — auto-open job drawer from notification deep link

In `src/components/admin/JobsTab.tsx`:

- After `fetchJobs()` resolves, check `sessionStorage.getItem("openJobId")`. If set and the job is in the loaded list, set `selected` to that job, switch `section` to the matching one via `getSectionForJob`, then clear the storage key.
- This makes the bell's "Open Job" button land directly on the right job drawer.

## 3. Audit-note enrichment (already present, verify wording)

`updateJobStatus` already writes `Status: previous → new (by actor) — Reason: …` to `crm_notes` and inserts notifications carrying `previous_status`, `new_status`, `reason`, `job_id` in metadata. No change needed — the bell will now surface them.

## 4. Job lifecycle controls inside the drawer (New → Scheduled → Completed)

Today the drawer only shows the `JobStatusActions` matrix (Start / Cancel / Complete / Reopen / Restore). Add a clearer **lifecycle stepper** above it so admins can move a job through its sections without thinking about raw statuses.

Update `src/components/admin/jobs/JobStatusActions.tsx` (or add a sibling `JobLifecycleStepper.tsx` rendered just above it in the drawer):

- Render three pill-buttons in a row representing the lifecycle:
  ```text
  [ New ] ──▶ [ Scheduled ] ──▶ [ Completed ]
  ```
- Current stage is filled (`bg-primary text-primary-foreground`); past stages are muted-filled with a check; future stages are outline.
- Stage mapping:
  - **New** = job is in the "new" section (status `scheduled` AND either unassigned OR <24h old). Clicking "Move to Scheduled" requires an assignee — if none, show inline hint "Assign a cleaning technician first".
  - **Scheduled** = status `scheduled` past 24h with assignee, or `in_progress`. Clicking "Mark Completed" calls `onTransition("completed")`.
  - **Completed** = status `completed`. Clicking it on a completed job is a no-op (or offers Reopen via existing actions).
- The existing `JobStatusActions` matrix stays underneath as the "Advanced" controls (Cancel, Reopen, Restore, Start In Progress) — these are edge actions, the stepper covers the happy path.
- For "New → Scheduled" we don't need a status DB change (status stays `scheduled`); instead we just need the section to flip. Two ways to flip a job out of "New":
  1. Assign a technician (already works via `getSectionForJob`), or
  2. Mark the job as no longer fresh — add a small `acknowledged_at`/no-op approach is overkill. Simplest: require assignee + show a single-click "Confirm scheduled" that calls `reassignJob` (if needed) and adds an audit note "Acknowledged & scheduled by {actor}". The 24h age rule then naturally moves it.

Recommend **option 1** (assignee-driven). The stepper button "Move to Scheduled" simply opens the existing assignee dropdown when no tech is assigned, otherwise it does nothing destructive — it's purely a visual confirmation.

## 5. Drawer status pill reflects lifecycle

Above the stepper, add a single line: `Lifecycle: New • Scheduled • Completed` with the current stage bolded, so the admin always sees where the job sits.

## 6. Quick check — preview "not working" report

The user mentioned the preview isn't showing after a change. The only items in console logs are benign React `forwardRef` warnings from `CalendarTab`'s `Select` usage (not a crash). Plan to:

- Tail the dev-server log to confirm there isn't a build error blocking HMR.
- If the build is fine, the preview issue is likely a stale cache — the new edits in steps 1–5 will trigger a fresh rebuild and resolve it. No code fix needed beyond a quick verification.

## Files Modified

| File | Change |
|---|---|
| `src/components/NotificationBell.tsx` | Register `job_*` types, render prev→new pill + reason, deep-link via sessionStorage |
| `src/components/admin/JobsTab.tsx` | Read `openJobId` from sessionStorage, open drawer + switch section |
| `src/components/admin/jobs/JobStatusActions.tsx` | Add lifecycle stepper (New → Scheduled → Completed) above existing action matrix |

## Out of Scope

- Email notifications for status transitions (only in-app + toast for now)
- Server-side enforcement of the lifecycle (still client-driven; RLS already restricts who can update jobs)