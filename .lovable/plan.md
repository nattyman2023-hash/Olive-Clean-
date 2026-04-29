# Jobs Workflow Improvements

Fix the broken job lifecycle so jobs flow cleanly through **New → Scheduled → Completed**, and make every job editable and actionable from the drawer and the list.

## Problems being fixed

1. **Wrong section logic** — `JobsSectionTabs.tsx` uses a 24-hour age rule, so assigned jobs get stuck in "New" instead of moving to "Scheduled".
2. **Drawer is cluttered** — the lifecycle stepper duplicates the status actions and the audit log already shows history.
3. **No quick actions on cards** — admins have to open the drawer just to assign or start a job.
4. **Inconsistent styling** — hard-coded violet classes, missing source pills, weak empty states.

## Changes

### 1. Section rules (intent-based)
In `src/components/admin/jobs/JobsSectionTabs.tsx`, replace `getSectionForJob`:

- **New** → `status='scheduled'` AND `assigned_to IS NULL` (unassigned inbox)
- **Scheduled** → (`status='scheduled'` AND `assigned_to IS NOT NULL`) OR `status='in_progress'`
- **Completed** → `status='completed'`
- **Archived** → `status='cancelled'`

Add client-side pagination to the **New** section to match the others.

### 2. Drawer simplification
In `src/components/admin/jobs/JobStatusActions.tsx`:

- Remove the lifecycle stepper UI block (the audit log already covers this).
- Rename the section to **Actions**.
- Show only context-aware buttons based on current status:
  - `scheduled` + unassigned → **Assign Technician**, **Edit**, **Cancel**
  - `scheduled` + assigned → **Start Job**, **Reassign**, **Edit**, **Cancel**
  - `in_progress` → **Mark Complete**, **Edit**, **Cancel**
  - `completed` → **Reopen** (admin-only), **Edit Notes**
  - `cancelled` → **Restore to Scheduled**
- Replace hard-coded `violet-*` classes with semantic tokens (`primary`, `muted-foreground`, etc.).

### 3. Card quick actions
In `src/components/admin/JobsTab.tsx`, add a `...` dropdown menu to each job card with shortcuts: **Assign**, **Start Job**, **Mark Complete**, **Edit**, **Cancel** (filtered by current status). Each calls the same handlers used by the drawer so audit log + notifications stay consistent.

### 4. UI polish
- Always render a source pill (Manual / Quote / Lead) on every card for filter consistency.
- Improve empty states with a "Clear filters" button or a hint pointing to the right section.
- Use semantic color tokens throughout the Jobs surface.

## Files touched

- `src/components/admin/jobs/JobsSectionTabs.tsx` — new section rules + pagination on New
- `src/components/admin/jobs/JobStatusActions.tsx` — remove stepper, context-aware actions, semantic colors
- `src/components/admin/JobsTab.tsx` — card-level quick action menu, source pill, empty states

## Out of scope

No DB schema changes. The audit log, edit drawer, and notification read-receipts shipped previously remain as-is.

## Open question

The new section rules will **immediately reshuffle existing jobs** across the New/Scheduled tabs (assigned jobs that were sitting in "New" because of the 24h rule will jump to "Scheduled"). Confirm that's the intended behavior before I implement.
