

## Replace Emails with Quote Engine

### Overview
Remove "Emails" from the Assets sidebar category and build a dedicated **Quotes** tab under Management. The existing `estimates` table and `EstimatesSection` component already handle basic quote CRUD — we'll upgrade them into a full Quote Engine with scheduling, view tracking, service template integration, and a one-click approve flow.

### Database Changes

**Migration 1 — Add columns to `estimates` table:**
- `scheduled_at` (timestamptz, nullable) — when to send the quote email
- `viewed_at` (timestamptz, nullable) — first time client opened it
- `view_count` (integer, default 0) — how many times client viewed
- `approved_at` (timestamptz, nullable) — when client clicked "Approve"
- `approval_token` (text, unique, nullable) — secure token for approve/view links
- `sent_at` (timestamptz, nullable) — actual send timestamp

**Migration 2 — RLS for client view access:**
- Add policy: anon/public can SELECT an estimate by `approval_token` match (for the public approve page)

**Migration 3 — pg_cron job for scheduled quotes:**
- A cron job (every minute) calls a new edge function `process-scheduled-quotes` that finds estimates where `status = 'scheduled'` and `scheduled_at <= now()`, sends the email, and updates status to `sent`.

### New Edge Functions

1. **`process-scheduled-quotes`** — Called by pg_cron. Finds due quotes, sends estimate-sent emails, updates status to `sent` and `sent_at`.

2. **`quote-action`** — Public endpoint (no JWT). Accepts `?token=X&action=view|approve`.
   - `action=view`: Increments `view_count`, sets `viewed_at` if first view, returns the quote data as JSON (or redirects to a public quote page).
   - `action=approve`: Sets `status = 'accepted'`, `approved_at = now()`, returns success page/redirect.

### Navigation Changes

**`AdminSidebar.tsx`:**
- Remove `emails` from Assets items
- Add `{ value: "quotes", label: "Quotes", icon: FileText }` to Management group (after Finance)

**`AdminDashboard.tsx`:**
- Remove `EmailsTab` import and its case in `renderSection`
- Add `QuotesTab` import and `case "quotes": return <QuotesTab readOnly={readOnly} />`

### New Component: `src/components/admin/QuotesTab.tsx`

A dedicated full-page quotes manager (not nested inside Finance tabs). Features:

1. **Service Template Integration** — When adding line items, a dropdown pre-fills from `service_templates` (name, description, default_price). Can still add custom items.

2. **Quote List** with status badges: Draft, Scheduled, Sent, Viewed, Accepted, Declined, Converted. Show `view_count` indicator on Viewed/Sent quotes (e.g., "Viewed 3x").

3. **Schedule Send UI** — Two buttons on draft quotes: "Send Now" and "Schedule". Schedule opens a date/time picker that saves to `scheduled_at` and sets status to `scheduled`.

4. **Resend Button** — On Sent/Viewed quotes, a "Resend" button re-triggers the estimate-sent email.

5. **Client filter** — Filter quotes by client. When viewing a client in ClientsTab, link to their quotes.

6. **Convert to Invoice** — Keep existing "To Invoice" flow from EstimatesSection.

### Quote Form Upgrade

Enhance `InvoiceForm.tsx` (or create a new `QuoteForm.tsx`):
- Add a "Pick from Services" dropdown that loads `service_templates` and auto-fills description + rate
- Generate `approval_token` (crypto random UUID) on creation
- Add `scheduled_at` field with "Send Now" / "Pick Date/Time" toggle

### Email Template Update

Update `estimate-sent.tsx` to include:
- A prominent "View Quote" button linking to `/quote/{approval_token}`
- An "Approve Quote" button linking to the `quote-action` edge function with `action=approve`

### Public Quote Page: `src/pages/QuoteView.tsx`

- Route: `/quote/:token`
- Fetches estimate by `approval_token` via edge function (increments view count)
- Shows branded quote with Olive Clean logo, line items, total
- "Approve" button calls `quote-action?action=approve`
- Shows "Already approved" if status is accepted

### Client Profile Integration

In `ClientsTab.tsx`, add a "Quotes" section that filters estimates by `client_id`, showing the full history of quotes sent to that client.

### Files Summary

| File | Action |
|------|--------|
| Database migration | Add `scheduled_at`, `viewed_at`, `view_count`, `approved_at`, `approval_token`, `sent_at` to `estimates`; add public SELECT policy by token |
| `src/components/admin/AdminSidebar.tsx` | Remove `emails`, add `quotes` under Management |
| `src/pages/AdminDashboard.tsx` | Replace EmailsTab with QuotesTab |
| `src/components/admin/QuotesTab.tsx` | New — full quote engine UI with list, filters, schedule, resend, view tracking |
| `src/components/admin/finance/InvoiceForm.tsx` | Add service template picker, approval_token generation, schedule option |
| `supabase/functions/process-scheduled-quotes/index.ts` | New — cron-driven scheduled quote sender |
| `supabase/functions/quote-action/index.ts` | New — public view/approve endpoint |
| `supabase/functions/_shared/transactional-email-templates/estimate-sent.tsx` | Add "View Quote" and "Approve" buttons with token links |
| `src/pages/QuoteView.tsx` | New — public branded quote page with approve button |
| `src/App.tsx` | Add `/quote/:token` route |
| `src/components/admin/FinanceTab.tsx` | Remove Estimates tab (moved to standalone Quotes) |
| `src/components/admin/ClientsTab.tsx` | Add quotes history section to client detail view |

