

# Next Phase: Email Preview UI + Admin Digests + Booking Confirmation

## 1. Email Template Preview UI

Add a preview panel to the existing Emails tab that lets admins view rendered versions of all registered email templates.

**Approach:** The `preview-transactional-email` Edge Function already exists and returns rendered HTML for all templates with `previewData`. We'll add a "Templates" sub-tab to `EmailsTab.tsx` that fetches previews and displays them in an iframe.

**Changes:**
- **`src/components/admin/EmailsTab.tsx`** — Add a tab toggle (Logs | Templates). The Templates view fetches from `preview-transactional-email`, lists template cards with name/subject, and renders selected template HTML in a sandboxed iframe. Includes a "Send Test" button that invokes `send-transactional-email` with the admin's own email.

## 2. Booking Confirmation Email

Send a branded confirmation email to clients when a booking is approved (status → "confirmed").

**Changes:**
- **`supabase/functions/_shared/transactional-email-templates/booking-confirmation.tsx`** — Already exists with the right styling and props (name, service, frequency, homeType, bedrooms, bathrooms). Already registered in `registry.ts`.
- **`src/components/admin/BookingsTab.tsx`** — In the `updateStatus` function, when status changes to `"confirmed"`, invoke `send-transactional-email` with the `booking-confirmation` template, passing booking details as `templateData` and using `booking-confirm-${id}` as the idempotency key.
- **Redeploy** `send-transactional-email` to ensure latest registry is active.

## 3. Admin Digest Emails

Create a scheduled daily summary email sent to admin users with key stats (bookings, jobs, revenue).

**Changes:**
- **`supabase/functions/_shared/transactional-email-templates/admin-daily-digest.tsx`** — New template showing: new bookings count, jobs completed, revenue collected, pending items. Styled consistently with existing templates.
- **`supabase/functions/_shared/transactional-email-templates/registry.ts`** — Register the new template.
- **`supabase/functions/send-admin-digest/index.ts`** — New Edge Function that:
  1. Queries stats from `booking_requests`, `jobs`, and `invoices` for the last 24h
  2. Looks up admin users via `user_roles` table
  3. Calls `send-transactional-email` for each admin with the digest data
- **Schedule via pg_cron** — Add a daily cron job (8 AM) that invokes `send-admin-digest`
- **`supabase/config.toml`** — Add `send-admin-digest` function config

## Files Changed

| File | Action |
|------|--------|
| `src/components/admin/EmailsTab.tsx` | Modified — add Templates preview sub-tab |
| `src/components/admin/BookingsTab.tsx` | Modified — send booking-confirmation on approve |
| `_shared/transactional-email-templates/admin-daily-digest.tsx` | Created |
| `_shared/transactional-email-templates/registry.ts` | Modified — add digest template |
| `supabase/functions/send-admin-digest/index.ts` | Created |
| `supabase/config.toml` | Modified — add send-admin-digest config |

## Deployment

- Deploy `send-transactional-email` (registry update)
- Deploy `preview-transactional-email` (registry update)
- Deploy `send-admin-digest` (new function)
- Create pg_cron job for daily digest

