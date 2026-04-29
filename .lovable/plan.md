# Jobs Tab Polish + Quote Conversion Reliability

Four targeted improvements to the Jobs workflow based on real-world feedback and a verified data bug.

## 1. Rename "Converted" → "Completed"

In `src/components/admin/jobs/JobsSectionTabs.tsx`:
- Rename the `converted` section label to **"Completed"** (keep the internal key `converted` to avoid a wider refactor, OR rename key to `completed` everywhere — recommend renaming key for clarity).
- Update icon stays `CheckCircle2`.
- Update `getSectionForJob`: `status === "completed"` → returns `"completed"`.
- Update `JobsTab.tsx` section state type, counts object, and any references.

The word "Converted" was confusing — a finished cleaning job is "Completed". "Converted" stays a Quote-engine term only.

## 2. Source Filter — Promote to Visible Chip Row

Currently the source picker is a small dropdown squeezed at the right of the quick-chip row. Replace it with a dedicated, labeled chip group directly under the section tabs:

```text
Source:  [ All ] [ Manual ] [ From quote ] [ From lead ] [ From booking ]
```

- Each chip shows a live count (jobs in current section matching that source).
- Active chip: filled `bg-primary text-primary-foreground`.
- Counts derive from the same `jobs` array, filtered by current section only (independent of search/date filters so users can see what's hidden).
- Keeps the existing `sourceFilter` state and filter logic in `filtered`.

## 3. Pagination for Scheduled & Completed Sections

Long histories make the list unscrollable. Add client-side pagination (server-side is overkill for current volume):

- New state: `const [page, setPage] = useState(1)` and `const PAGE_SIZE = 20`.
- Apply pagination **only** when `section === "scheduled" || section === "completed"`. New & Archived stay un-paginated (typically small).
- Slice `filtered` for display: `paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)`.
- Reset `page` to 1 when section, search, sourceFilter, or any filter changes (single `useEffect`).
- Render a compact pager at the bottom of the list:
  ```text
  ‹ Prev   Page 1 of 4   Next ›        Showing 1–20 of 73
  ```
- Disable Prev on page 1, Next on last page. Keep "Select all" semantics scoped to the current page.

## 4. Toast + In-App Notifications for Every Audit Event

Today only the actor sees a toast and only `quote_converted` writes a `notifications` row. Expand coverage so other admins/staff see activity in real time.

### A. Quote → Job Conversion (`src/lib/convertQuoteToJob.ts`)
Already inserts `notifications` for admins (good). Add:
- Toast call in callers (`EstimatesSection.tsx`, `quote-action` Edge Function results) that surfaces both success and the `alreadyConverted` short-circuit case. Confirm both UI entry points already toast — if not, add `toast.success("Quote ${number} converted to job")`.

### B. Every Job Status Transition (`JobsTab.tsx → updateJobStatus`)
After the existing `crm_notes` audit insert, fan out an in-app notification to all admins (and to the assigned cleaning technician, if any):

```ts
const recipients = new Set<string>();
const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
admins?.forEach(a => recipients.add(a.user_id));
if (job?.assigned_to) recipients.add(job.assigned_to);

const titleMap = {
  in_progress: "Job started",
  completed: "Job completed",
  cancelled: "Job cancelled",
  scheduled: "Job restored",
};
await supabase.from("notifications").insert(
  Array.from(recipients).map(uid => ({
    user_id: uid,
    type: `job_${status}`,
    title: `${titleMap[status]} — ${job?.clients?.name ?? "Client"}`,
    body: `${prettyService} · ${prettyDate}${reason ? ` · Reason: ${reason}` : ""}`,
    metadata: { job_id: id, previous_status: previousStatus, new_status: status, reason: reason || null },
  }))
);
```

This keeps the toast for the actor (already present) and adds bell-icon notifications for the rest of the team, mirroring the audit note 1:1.

### C. Self-suppression
Skip inserting a notification for the actor (`auth.uid()`) — they already saw the toast. Prevents bell spam.

## 5. Bug Fix — Orphaned "Converted" Quotes Not Producing Visible Jobs

Verified in DB: estimate `EST-MNWDCHXV` has `status='converted'` but `converted_job_id IS NULL` — meaning a prior conversion attempt half-succeeded (estimate flipped, job never created). The new `convertQuoteToJob` helper would still process it (idempotent guard requires BOTH `status='converted'` AND `converted_job_id`), but no UI surfaces this.

Fixes:
1. **One-time backfill migration** — for every `estimates` row where `status='converted'` and `converted_job_id IS NULL`, either:
   - Reset to `status='accepted'` so admin can manually re-trigger conversion, OR
   - Run conversion server-side via a `DO` block calling the same insert logic.
   
   Recommend **option 1** (safer): mark them `accepted` and add a `crm_note` "Auto-reset by system: conversion never produced a job. Please re-convert."
2. **Quote engine highlight** — in `EstimatesSection.tsx`, surface accepted-but-not-converted quotes with a yellow "Needs conversion" badge so they don't get lost.
3. **Defensive check in `convertQuoteToJob.ts`** — wrap steps 1–3 in a logical try/catch with rollback (delete the half-created job if estimate update fails, etc.) to prevent recurrence.

## Files Modified

| File | Change |
|---|---|
| `src/components/admin/jobs/JobsSectionTabs.tsx` | Rename Converted → Completed (key + label) |
| `src/components/admin/JobsTab.tsx` | Update section types, add source-chip row, add pagination, fan-out notifications, suppress self |
| `src/lib/convertQuoteToJob.ts` | Wrap conversion in try/rollback for atomicity |
| `src/components/admin/finance/EstimatesSection.tsx` | "Needs conversion" badge for orphaned accepted quotes |
| **New migration** | Backfill orphaned converted-without-job estimates back to `accepted` |

## Out of Scope (note for next pass)

- Outreach Hub win-back Kanban
- Clients Tab profile enrichment
- Drag-and-drop on Leads Kanban (still pending from earlier requests)
