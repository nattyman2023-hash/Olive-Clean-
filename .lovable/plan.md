

## Plan: Stripe Webhook, Preference-to-Tasks Conversion & Testing Notes

### Testing Notes (Manual)

The following items need manual verification from the admin dashboard:
- Create a service template with a price and confirm the Stripe sync badge appears
- Mark an invoice as "sent" and verify the email contains a Pay Now button
- Click a lead, edit its details, and delete it

These are existing features — no code changes needed. Test them in the live preview.

---

### 1. Stripe Webhook for Auto-Marking Invoices as Paid

**What it does:** When a customer completes a Stripe Checkout payment, Stripe sends a `checkout.session.completed` event to our webhook. The webhook verifies the signature, reads the `invoice_id` from session metadata, and updates the invoice status to "paid" with a timestamp.

**New file:** `supabase/functions/stripe-webhook/index.ts`

- Listens for POST requests from Stripe
- Verifies the webhook signature using a `STRIPE_WEBHOOK_SECRET` secret
- Handles `checkout.session.completed` events
- Reads `metadata.invoice_id` from the session
- Updates the `invoices` table: `status = 'paid'`, `paid_at = now()`
- Returns 200 to Stripe

**Config:** Add `[functions.stripe-webhook]` with `verify_jwt = false` to `supabase/config.toml` (Stripe sends unsigned requests, no JWT).

**Secret needed:** `STRIPE_WEBHOOK_SECRET` — the user will need to configure a webhook endpoint in their Stripe Dashboard pointing to the edge function URL, then provide the signing secret.

---

### 2. Convert Customer Preferences to Cleaner Tasks

**What it does:** Currently, client preferences (pets, allergies, special instructions, parking info, etc.) are shown as raw key-value pairs in a "Home Memory" box. This change converts relevant preferences into actionable checklist items that appear alongside the service checklist.

**Modified file:** `src/pages/EmployeeDashboard.tsx`

- Add a `getPreferenceTasks()` function that maps preference keys to concrete task items:
  - `Pets` → "Be mindful of pets: {value}" 
  - `Allergies` → "Avoid products containing: {value}"
  - `Special Instructions` → each instruction as a task
  - `Preferred Products` → "Use client's preferred products: {value}"
  - `Rooms Priority` → "Prioritize: {value}"
  - `Gate Code` / `Alarm Code` / `Parking Info` → shown as info notes (not checkable tasks)
- Display preference-derived tasks in a separate "Client Tasks" section above the standard service checklist, with a distinct visual style (amber/olive themed)
- These are checkable items stored in `checklist_state` alongside regular checklist items, prefixed with `pref_` to distinguish them
- The "Home Memory" raw display remains but is collapsed by default since the actionable items are now surfaced as tasks

---

### Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Create — webhook handler |
| `supabase/config.toml` | Add `stripe-webhook` with `verify_jwt = false` |
| `src/pages/EmployeeDashboard.tsx` | Modify — preference-to-tasks logic |

