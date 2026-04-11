

## Branded Stripe Invoicing + Payment Tracking

### What Changes

Currently, when Finance clicks "Send" on a draft invoice, it just updates the status and sends a branded email with a link to the client dashboard. The client then has to log in and click "Pay Now" to create a Stripe Checkout session on-the-fly.

The new flow: Finance clicks **"Finalize & Send"** → system creates a Stripe Checkout session server-side → saves the checkout URL to the invoice → sends the branded email with a direct "Securely Pay via Stripe" button → webhook marks invoice as "paid" and logs the payment in Comms Log.

### Changes

#### 1. Add `stripe_checkout_url` column to `invoices` table
Database migration to add the field for storing the pre-generated Stripe checkout URL.

#### 2. New Edge Function: `finalize-invoice`
Called by the admin frontend when Finance clicks "Finalize & Send" on a draft invoice. It:
- Fetches invoice + client details (service role)
- Creates a Stripe Checkout session with invoice line items and metadata
- Updates the invoice: `status → "sent"`, `issued_at → now()`, `stripe_checkout_url → session.url`
- Sends the branded `invoice-issued` email via `send-transactional-email` with the Stripe checkout URL as the `paymentUrl`
- Inserts a notification for finance users

#### 3. Update `InvoicesSection.tsx`
- Replace the current "Send" button on draft invoices with **"Finalize & Send"** that calls the new `finalize-invoice` edge function instead of doing a simple status update
- Show a loading state while the checkout session is being created
- Remove the manual "Paid" button (payment is now tracked automatically via webhook)

#### 4. Update `invoice-issued.tsx` email template
- Change button text from "Pay Now — $X" to **"Securely Pay via Stripe — $X"**
- Update copy to reflect the direct payment experience

#### 5. Update `stripe-webhook/index.ts`
After marking an invoice as "paid", also:
- Log the payment in `email_send_log` (or a dedicated comms log entry) so Finance can see it in Comms Log
- Insert a notification for finance users: "Invoice INV-XXX paid by [client]"

#### 6. Update `ClientInvoices.tsx`
- If `stripe_checkout_url` exists on a sent/overdue invoice, use it directly instead of calling `create-invoice-payment` to generate a new session

### Files Summary

| File | Action |
|------|--------|
| Database migration | Add `stripe_checkout_url` text column to `invoices` |
| `supabase/functions/finalize-invoice/index.ts` | New — creates Stripe session, updates invoice, sends branded email |
| `src/components/admin/finance/InvoicesSection.tsx` | Replace "Send" with "Finalize & Send" calling new function |
| `supabase/functions/_shared/transactional-email-templates/invoice-issued.tsx` | Update button text to "Securely Pay via Stripe" |
| `supabase/functions/stripe-webhook/index.ts` | Add payment logging to comms log + finance notification |
| `src/components/client/ClientInvoices.tsx` | Use stored checkout URL when available |
| `supabase/config.toml` | Add `finalize-invoice` function config |

