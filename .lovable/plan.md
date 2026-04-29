# Leads & Quotes — Fixes Pass

Focused on the gaps you flagged. No Jobs/Outreach/Clients work in this pass — those come next.

## 1. Add Lead (manual entry)

New **"+ Add Lead"** button at top-right of `LeadsTab.tsx`, next to the search/filters. Opens a right-side drawer (`AddLeadDrawer.tsx`) using:
- `Input` for name + email
- `PhoneInput` (E.164 validated)
- `AddressInput` (street / city / state / zip)
- Optional: bedrooms, bathrooms, frequency, urgency, source (default `manual`), notes

On save: insert into `leads` with `status='new'`, `source='manual'`, structured address fields. Toast + close + refresh Kanban.

## 2. Drag-and-drop verification & fix

The DnD is wired in `LeadsKanban.tsx` but you say it's not working. Likely causes:
- Card drag handle overlapping clickable areas (whole-card click hijacks pointer before activation distance hits)
- Sensor `activationConstraint: { distance: 6 }` may need to drop to `4`, or switch to a dedicated drag handle (grip icon top-right of card)

Fix: add an explicit drag-handle area on `LeadKanbanCard.tsx` (small grip icon, `cursor-grab`) so clicking the card body still opens the drawer but dragging only works from the handle. Also add visual feedback (cursor + opacity) during drag.

## 3. Remove duplicate "Create Quote" actions

Audit:
- `LeadKanbanCard.tsx` "Quote" button
- Lead detail drawer "Create Quote" button
- Drag-to-Quoted column auto-trigger

Keep **one** path: a single "Create Quote" button inside the **lead detail drawer** + the drag-to-Quoted-column shortcut. Remove the redundant button from the kanban card itself (cards stay clean — click to open drawer, drag to move).

## 4. Quick Quote button on Quotes tab (walk-in caller flow)

New **"+ Quick Quote"** button at top of `QuotesTab.tsx`. Opens a drawer that does the full flow in one place:

**Step 1 — Client lookup/create (inline in drawer):**
- Search field that matches existing clients by name/email/phone (live)
- If no match: inline form with name + `PhoneInput` + email + `AddressInput`
- On submit, calls `findOrCreateClient` (already exists) — returns client_id

**Step 2 — Build the quote:**
- Reuses `InvoiceForm` (`type="estimate"`) prefilled with that client_id
- Default 14-day expiry (already implemented)
- Save → creates estimate → toast with "Send to client" action that triggers existing send flow

This means admins can take a phone call and produce a sendable quote without ever touching Leads.

## 5. PhoneInput / AddressInput rollout

Replace plain text inputs in:
- `AddLeadDrawer.tsx` (new) — uses both
- Quick Quote drawer client form — uses both
- `ClientsTab.tsx` add/edit client form — uses both
- `BookingsTab.tsx` admin booking form — uses both
- Public `BookPage.tsx` booking form — uses both
- `LeadQuoteDrawer.tsx` — uses both when prefilling

`findOrCreateClient` already accepts the structured fields — passing them through populates `address_line1`, `city`, `state`, `zip` on the `clients` row.

## 6. Lead → Client conversion uses structured address

When converting a lead, use `lead.address_line1/city/state/zip` (now populated by manual entry) to create the client with structured fields, not just the legacy single-line `location`.

---

## Technical Details

**New files**
- `src/components/admin/leads/AddLeadDrawer.tsx`
- `src/components/admin/finance/QuickQuoteDrawer.tsx` (wraps a client lookup + InvoiceForm)
- `src/components/admin/shared/ClientLookupOrCreate.tsx` (shared search-or-create combobox, reusable)

**Modified**
- `src/components/admin/LeadsTab.tsx` — Add Lead button + drawer trigger
- `src/components/admin/leads/LeadKanbanCard.tsx` — drag handle, remove inline Quote button
- `src/components/admin/leads/LeadsKanban.tsx` — sensor tuning if needed
- `src/components/admin/QuotesTab.tsx` — Quick Quote button + drawer
- `src/components/admin/ClientsTab.tsx` — Phone/Address inputs in client form
- `src/components/admin/BookingsTab.tsx` — Phone/Address inputs
- `src/pages/BookPage.tsx` — Phone/Address inputs on public form
- `src/lib/findOrCreateClient.ts` — already supports structured fields, no change needed

**No DB migrations** — `leads` and `clients` already have `address_line1/city/state/zip` from the previous pass.

---

## What this does NOT include (next passes)

- Jobs Tab sectioned redesign (New / Scheduled / In Progress / Completed / Cancelled + cancel reason + refund)
- Outreach Hub win-back Kanban
- Clients Tab profile enrichment beyond address fields
- End-to-end backend dedup audit across booking_requests → clients

Approve and I'll ship this slice.