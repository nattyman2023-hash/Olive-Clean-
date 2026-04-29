## Big-Picture Cleanup Across Leads → Quotes → Jobs → Clients → Outreach

This is one connected workflow. Right now, the same actions live in 2–3 different screens (e.g. "create quote" lives in Leads AND Quotes AND Clients), statuses overlap (a job has both "complete" and "completed" labels in places), and contact data is unstructured. We're going to fix the workflow first, then tighten the data model so duplications disappear.

---

### 1. Shared input components (foundation)

Two new reusable inputs used everywhere a person types contact info:

**`PhoneInput`** — wraps `react-phone-number-input` (small, ~15 KB).
- Auto-formats as user types: `(615) 555-0142`
- Validates with `libphonenumber-js` (E.164 storage, `+16155550142`)
- Defaults to US, allows international
- Inline red error if invalid on blur
- Used in: New Lead form, Lead edit, Client form, Client edit, Booking form, Questionnaire, Quote-from-lead drawer

**`AddressInput`** — structured 5-field group (street #, street name, city, state dropdown, ZIP).
- ZIP validated against `/^\d{5}(-\d{4})?$/`
- State is a `<Select>` with US states
- On blur, builds a single formatted string written to `clients.address` for backwards compatibility
- Stored separately in new columns (see migration below) so we can sort/filter
- Used everywhere `address` / `location` is entered today

```text
[ # ] [ Street name              ]
[ City              ] [ State ▼ ] [ ZIP    ]
```

Both components live in `src/components/ui/` so other modules can adopt them.

---

### 2. Leads — Kanban polish + in-place Quote drawer

**Hover meaning on column headers** — wrap each column title in a `Tooltip` that shows the existing `stage.description` from `leadStageConfig.ts` ("Fresh leads awaiting first touch", etc.). Already half-built — just wire it up.

**Auto-archive Converted after 7 days** — in `leadStageConfig.ts → leadToStage()`, hide leads where `status='converted'` AND `created_at < now()-7d` (or use `converted_job_id` join with the job's `created_at`). They still show under the "Show archived" toggle.

**Create Quote without leaving Leads** — replace the `sessionStorage.setItem("prefill-quote") + onNavigate("quotes")` bounce with a slide-in `Sheet` (Drawer Standard) called `LeadQuoteDrawer`:
- Reuses `<InvoiceForm type="estimate" />` inside the sheet
- Pre-fills client (creates client row if missing), line items from the lead's service/bedrooms
- **Default expiry = today + 14 days** (configurable in form)
- On Save → marks lead `status='quoted'`, sends email, closes drawer, lead card visibly moves to "Quoted" column
- "Send Now" and "Schedule" buttons live inside the drawer, no page change

**Accept on behalf of customer** — in the lead drawer's quote list (and in `QuotesTab`), add a "Mark Accepted (phone)" button on any sent/viewed quote. Writes `status='accepted'`, `approved_at=now()`, `accepted_via='phone'`, plus a CRM note "Accepted by phone by {admin name}". Triggers the same downstream conversion as a customer-clicked accept.

**Auto-convert accepted quote → Job + remove from quote engine**: the `quote-action` edge function already creates a job on accept. Extend it to:
- Set lead `status='converted'`, `converted_job_id=<new job id>`
- Set quote `status='converted_to_job'` so it disappears from the active Quote Engine list (still viewable via filter)
- Create a draft `invoice` row with `estimate_id`, items copied, status='draft' — ready to populate later

**Reject capture** — extend `QuoteView.tsx` (the public page) to add a "Decline" button alongside Approve. Captures optional reason in a textarea, calls `quote-action` with `action='decline'`, writes `status='declined'`, `declined_at`, `decline_reason`. Shows in Lead drawer activity timeline.

**Reset / Resend a quote** — in QuotesTab and Lead drawer:
- *Resend* (already exists) — re-emails current token
- *Reset* (new) — generates a new `approval_token`, clears `viewed_at`/`view_count`/`approved_at`/`declined_at`, status back to `draft`. Confirm dialog.

---

### 3. Quotes Tab — purpose narrowed

**Quote Engine is now ONLY for**:
- Manually created quotes (no lead) — e.g. walk-in, referral
- All quotes still in motion (`draft`, `scheduled`, `sent`, `viewed`, `declined`)

**Hidden from active list**: quotes with `status='converted_to_job'` or `status='converted'` (already invoiced). They live behind a "Show converted" filter toggle.

**Once accepted → invoice is drafted automatically** and linked. The quote row stays in DB for history but vanishes from the working list. Click-through from invoice shows the source quote.

---

### 4. Jobs Tab — fix "Complete vs Completed" + sectioned view

The duplicate label is in two places: `jobStatusConfig.completed.label = "Completed"` (correct) but other parts of the app render the raw `status` string elsewhere. We will:

- Use `jobStatusConfig[status].label` everywhere (single source of truth)
- Confirm the DB only ever stores `completed` (not `complete`) — write a one-time data fix if any rows have `complete`

**New sectioned layout** (replaces the flat scrolling list). Order required by user:

```text
┌─ NEW JOBS (unassigned, created in last 24h)            ─┐
├─ SCHEDULED (assigned, future)                           ─┤
├─ IN PROGRESS (clocked in)                               ─┤
├─ COMPLETED (collapsed by default, last 7 days only)     ─┤
└─ CANCELLED (collapsed, with Reschedule + Refund actions)┘
```

Each section is collapsible (Shadcn `Collapsible`), has its own count badge, and **Completed defaults to last 7 days** with a "Show older →" link that opens a modal with full pagination — the main view never has to scroll past finished work.

**Cancelled jobs get richer actions**:
- "Reschedule" button → opens job edit, status flips back to `scheduled`
- "Cancellation reason" field added to schema (`jobs.cancel_reason text`, `jobs.cancelled_at timestamptz`)
- "Request refund" → if job has a paid invoice, opens a small dialog that calls a new `request-refund` edge function (uses existing Stripe key) and logs a CRM note. Refund itself goes through Stripe with admin confirmation.

---

### 5. Clients Tab — richer profile

- Adopt `AddressInput` so each client now has structured `address_line1`, `city`, `state`, `zip` columns (kept `address` text column for legacy display)
- Adopt `PhoneInput` for the phone field
- Add a "Lifetime value" stat (sum of paid invoices), "Last service" date, "Loyalty tier" pulled from `perks_members`, and "Open quotes" count to the detail drawer
- Add a "Tags" multi-select (e.g. VIP, Allergies, Pets) stored in the existing `preferences` JSONB

---

### 6. Outreach Hub (`CallListTab`) — drag-and-drop + win-back only

Rebuild as a true Kanban using `@dnd-kit/core` (already installed for Leads):

- 4 columns stay: **Needs Nudge → Attempted → Speaking → Won Back**
- Cards draggable between columns, optimistic updates
- **Source data narrowed**: only show clients with at least one *past completed job* and no completed job in 45+ days. Drop "Stale Lead", "Stale Quote", and "Follow-up Task" sources — those already live in Leads (kanban) and in the lead drawer's task list. This makes the hub purely a **win-back tool**.
- Add a small explainer banner: "Customers who booked before but haven't returned. Drag to track your follow-up."
- "Won Back" cards persist for 30 days then auto-clear

---

### 7. Backend cleanup & dedup removal

After the changes above, these duplications can be removed:

| Today | After |
|-------|-------|
| `crm_notes` task creation in 3 places | One `useCreateNote` hook |
| 3 different "create quote from lead" entry points (Leads list, Leads kanban, Quotes tab "+New") | One `LeadQuoteDrawer` + one Quote Engine "+New" |
| Stale-quote logic computed in both `QuotesTab` (Priority Call List) and `CallListTab` | Single `useStaleQuotes()` hook, surfaces only in Quotes |
| Lead → Job conversion in `LeadsTab` AND in `quote-action` edge function | Centralize in `quote-action`; LeadsTab calls it via RPC |
| Two job status spellings (`complete` vs `completed`) | Single `completed`, with one-time UPDATE migration |
| Client lookup-or-create scattered in 4 components | New `findOrCreateClient(email, phone, name, address)` helper with email+phone dedup (matches the existing CRM dedup memory) |

**Database migrations** (one combined migration file):

```sql
-- Structured address
ALTER TABLE clients ADD COLUMN address_line1 text, ADD COLUMN city text,
                    ADD COLUMN state text, ADD COLUMN zip text;
ALTER TABLE leads   ADD COLUMN address_line1 text, ADD COLUMN city text,
                    ADD COLUMN state text, ADD COLUMN zip text;

-- Quote rejection + accept-source tracking
ALTER TABLE estimates ADD COLUMN declined_at timestamptz,
                      ADD COLUMN decline_reason text,
                      ADD COLUMN accepted_via text  -- 'customer' | 'phone'
                      DEFAULT 'customer';

-- Job cancellation context
ALTER TABLE jobs ADD COLUMN cancelled_at timestamptz,
                 ADD COLUMN cancel_reason text;

-- Data fix
UPDATE jobs SET status='completed' WHERE status='complete';

-- Default quote expiry constant lives in code, not DB
```

**New edge function**: `request-refund` — admin-only, validates job has paid invoice, calls Stripe `refunds.create`, writes back to invoice row, sends notification email.

**Edge function `quote-action` extended**: handle `action='decline'` and the auto-create-invoice-draft path.

---

### Files touched (estimated)

**New**
- `src/components/ui/PhoneInput.tsx`
- `src/components/ui/AddressInput.tsx`
- `src/components/admin/leads/LeadQuoteDrawer.tsx`
- `src/components/admin/jobs/JobsSectioned.tsx` (replaces inline list in JobsTab)
- `src/components/admin/jobs/CancelledJobActions.tsx`
- `src/lib/findOrCreateClient.ts`
- `src/hooks/useStaleQuotes.ts`
- `supabase/functions/request-refund/index.ts`
- One combined SQL migration

**Modified**
- `src/components/admin/LeadsTab.tsx` — drawer wiring, hide-converted-after-7d
- `src/components/admin/leads/leadStageConfig.ts` — tooltip descriptions wired
- `src/components/admin/leads/LeadsKanban.tsx` — header tooltips
- `src/components/admin/QuotesTab.tsx` — hide converted, add Reset button, "Mark accepted (phone)"
- `src/components/admin/JobsTab.tsx` — replace list with sectioned view
- `src/components/admin/ClientsTab.tsx` — new inputs, richer drawer
- `src/components/admin/CallListTab.tsx` — DnD + scope to win-back
- `src/pages/QuoteView.tsx` — Decline button + reason
- `src/components/admin/finance/InvoiceForm.tsx` — default `validUntil = today+14d` for estimates
- `supabase/functions/quote-action/index.ts` — decline path, invoice draft, lead conversion

---

### What we're explicitly NOT doing

- Building a separate sub-domain (decided previously to use code-splitting instead — already done)
- Touching the Outreach Hub's stale-lead/stale-quote sources beyond removing them (those signals stay visible inside Leads + Quotes themselves)
- Real-time auto-refunds without admin confirm (Stripe refunds always require admin click)

Approve and I'll execute in this order: (1) shared inputs + migration, (2) quote drawer + decline/accept-on-behalf, (3) Jobs sectioned view, (4) Clients enrichment, (5) Outreach DnD, (6) dedup cleanup pass.