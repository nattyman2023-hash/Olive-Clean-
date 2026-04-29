# Jobs Tab Redesign + Auto Quote-to-Job Conversion

## Goals
1. Reorganize the Jobs tab into 4 clear sections with safe, auditable status transitions and stronger filters.
2. Make accepted quotes (whether accepted by the customer via link or by an admin) automatically become a job, disappear from the active quote engine, and leave a visible trail everywhere.

---

## Part 1 — Jobs Tab Sectioned Redesign

### New section model
Status mapping (existing `jobs.status` values: `scheduled`, `in_progress`, `completed`, `cancelled`):

| Section | Includes | Purpose |
|---|---|---|
| **New** | `scheduled` jobs created in the last 24h **or** still unassigned (`assigned_to IS NULL`) | Triage queue — needs a tech assigned / confirmed |
| **Scheduled** | `scheduled` (assigned) + `in_progress` | Active operations board |
| **Converted** | `completed` | Done — invoice was auto-drafted, view payouts/feedback |
| **Archived** | `cancelled` | Cancellation reason + restore action |

Sections render as **tabs at the top** of the Jobs tab, with a count badge per section. Default tab = **New**. List/Map view toggle stays.

### Status-safe transitions
Replace the free-form status dropdown with an explicit transition matrix (only legal moves are shown as buttons in the drawer + bulk menu):

```text
scheduled ──▶ in_progress ──▶ completed
    │              │
    └──▶ cancelled ◀┘   (in_progress → cancelled requires reason)
completed ──▶ (locked, admin-only "reopen" reverts to in_progress)
cancelled ──▶ (admin-only "restore" → scheduled)
```

Rules enforced client-side + via existing RLS:
- Cannot skip from `scheduled` → `completed` without going through `in_progress` (prevents accidental completion of unstarted work).
- `cancelled` requires a reason saved to `jobs.cancel_reason` and timestamp `jobs.cancelled_at` (already exists).
- `completed` writes `completed_at` (already does); reopen clears it and the auto-draft invoice toast warns admin.
- Every transition writes a row to `crm_notes` (parent_type=`job`, parent_id=jobId, note_type=`status_change`) capturing actor, old → new, optional reason. This is the audit trail surfaced in the job drawer's Activity timeline.

### Better filters
Top filter bar (collapsible, persistent in URL params):
- Date range (from / to) on `scheduled_at`
- Assigned tech (multi-select)
- Service (multi-select)
- Neighborhood
- Source: `from_quote`, `from_lead`, `manual` — derived from `notes` prefix today; we'll add an explicit `jobs.source text` column for clean filtering
- Quick chips: **Today**, **This week**, **Unassigned**, **Overdue** (scheduled in past, not started)

Active filter count + "Clear all" stays as today.

### Visual layout
```text
┌──────────────────────────────────────────────────────────┐
│ Jobs   [+ New Job]                          [List | Map] │
├──────────────────────────────────────────────────────────┤
│ [New 4]  [Scheduled 27]  [Converted 113]  [Archived 6]  │
├──────────────────────────────────────────────────────────┤
│ Filters: Date▾  Tech▾  Service▾  Source▾  [Clear]       │
│ Chips:  Today · This week · Unassigned · Overdue        │
├──────────────────────────────────────────────────────────┤
│ ☐ Job rows … (compact, with status-aware action buttons)│
└──────────────────────────────────────────────────────────┘
```

Job detail still uses the right-side **Drawer Standard** sheet (per project memory).

---

## Part 2 — Automatic Quote → Job Conversion

### Today's gaps
- `quote-action` edge function (customer accepts via email link) creates a job ✅ but leaves the estimate at `status='accepted'`, so it still appears in the active quotes list.
- `EstimatesSection.updateStatus` (admin marks accepted) creates a job but does the same.
- There's a separate "Convert to Job" dialog (`handleConvertToJob`) — duplicated path.
- No audit trail entry on the quote, lead, or job.
- Customer/admin don't see a confirmation that the quote became Job #X.

### Unified conversion flow

A single helper in code (`src/lib/convertQuoteToJob.ts`) used by both the admin path and the edge function path. It performs an idempotent transaction:

1. Mark estimate `status='converted'`, set `converted_invoice_id` / new `converted_job_id` column on estimates (new column).
2. Create the `jobs` row with `source='quote'`, `notes='From quote {estimate_number}'`.
3. Create the draft invoice linked via `estimate_id` (already done).
4. Insert audit rows:
   - `crm_notes` on the **estimate** (parent_type=`estimate`): "Converted to Job #abcd1234 by {actor or 'customer via link'}"
   - `crm_notes` on the **job**: "Created from quote {estimate_number}"
   - If a matching lead exists (by `client_id` or email): set `leads.status='converted'`, `leads.converted_job_id`, add a note "Lead converted via quote acceptance"
5. Insert a row in `notifications` for all admins: "Quote {number} accepted — Job created" with metadata linking to the job (so it shows in the bell + daily digest).
6. Send the customer a transactional email `quote-accepted-confirmation` with the scheduled date placeholder + a link to view the job in their portal.

### "Removal from the quote engine"
- `EstimatesSection` filters out `status IN ('converted', 'declined', 'expired')` from the active list by default.
- Add a **"Show archived quotes"** toggle that reveals them with a clear converted/declined badge and a link to the resulting job.
- Stale-quotes widget already excludes non-`sent`; verified.

### User-visible status updates
- **Admin Quotes tab**: accepted quote immediately shows a green "Converted → Job #xxxx" pill and is moved out of the active list.
- **Admin Jobs tab**: new job lands in the **New** section with a "From quote" badge.
- **Bell notifications**: admins get a real-time notification (uses existing `notifications` table + realtime channel).
- **Customer portal** (`/portal`): client sees the new job in their upcoming list with a "Created from your accepted quote" note.
- **Email**: customer gets the confirmation email; admins get it surfaced in the daily digest under "Quotes converted today".

### Idempotency & race safety
The helper checks `estimates.status === 'converted'` first and returns the existing `converted_job_id` if present — covers the case where the customer clicks Approve twice or admin and customer race.

---

## Technical Details

### Database migration
- `ALTER TABLE jobs ADD COLUMN source text DEFAULT 'manual';` (values: `manual`, `quote`, `lead`, `booking`)
- `ALTER TABLE estimates ADD COLUMN converted_job_id uuid;`
- Backfill: `UPDATE jobs SET source='quote' WHERE notes ILIKE 'Auto-created from%quote%' OR notes ILIKE 'Converted from%';`
- No CHECK constraints (per project rules) — values validated in code.

### Files to add
- `src/lib/convertQuoteToJob.ts` — shared idempotent conversion helper (client-side, uses RLS).
- `src/components/admin/jobs/JobsSectionTabs.tsx` — tab strip with counts.
- `src/components/admin/jobs/JobStatusActions.tsx` — renders only legal transition buttons + cancel-reason / reopen confirm dialogs.
- `src/components/admin/jobs/JobFiltersBar.tsx` — extracted filter bar with quick chips and URL-param sync.

### Files to edit
- `src/components/admin/JobsTab.tsx` — replace the single status filter with the section tabs, integrate the new components, group rows by section.
- `src/components/admin/QuotesTab.tsx` + `src/components/admin/finance/EstimatesSection.tsx` — call the shared `convertQuoteToJob` helper, hide converted quotes from active list, show "Converted → Job #" pill, add "Show archived" toggle.
- `supabase/functions/quote-action/index.ts` — replace inline job/invoice/lead update block with the same logic (server-side equivalent), add `crm_notes` + `notifications` inserts, send `quote-accepted-confirmation` email, set `estimates.status='converted'` and `converted_job_id`.
- `supabase/functions/_shared/` — add a small `convertQuoteToJob.ts` mirror used by the edge function.

### New email template
- `supabase/functions/send-transactional-email` already supports templates by name — register `quote-accepted-confirmation` (subject: "Your cleaning is booked! 🌿", body: estimate number, total, link to portal).

### Removal of duplication
- Drop the standalone "Convert to Job" dialog in EstimatesSection — accepting a quote IS the conversion. Keep a "Reschedule job" action on the resulting job instead (in Jobs tab).
- Drop the duplicate job-creation block in `EstimatesSection.updateStatus`.

### Non-goals (call out so we don't scope-creep)
- Not changing the quote creation flow (Quick Quote drawer stays as-is).
- Not changing payout / feedback automations triggered by `completed`.
- Not touching the public quote-view page beyond the success state already there.

---

## Acceptance Checklist
- Jobs tab shows 4 tabs with live counts; default is **New**.
- Status buttons in the job drawer only show legal next states; cancel requires a reason.
- Every status change appears in the job's Activity timeline with actor + timestamp.
- Customer accepting a quote via email creates a job, hides the quote from the active list, fires admin notification + customer confirmation, and writes audit notes on quote, job, and (if present) lead.
- Admin marking a quote accepted does the exact same thing through the same helper.
- Re-clicking Approve doesn't create a duplicate job.
