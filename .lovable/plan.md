

# Client Account Setup Flow: Booking Confirmation → Password Setup Email

## Overview

When an admin confirms a booking, the system will automatically create a client record (if one doesn't exist), then send the client a password-setup email so they can access their Client Portal. Admin also gets a manual "Send Setup Email" button on the Clients tab for existing clients.

## Architecture

```text
Admin confirms booking → Edge Function triggered
  ├─ Creates client record (if needed)
  ├─ Creates auth user via invite (generates password reset link)
  ├─ Links client record to auth user
  ├─ Assigns "client" role
  └─ Client receives email → clicks link → /reset-password → sets password → logs into portal
```

## Changes

### 1. Edge Function: `invite-client` (new)

Creates a new edge function at `supabase/functions/invite-client/index.ts` that:
- Accepts `{ email, name, client_id? }` from the frontend
- Uses `supabase.auth.admin.inviteUserByEmail()` with the service role key to send a password-setup email
- If no `client_id` provided, creates a client record first
- Links the client record to the new auth user (`client_user_id`)
- Inserts a `user_roles` entry with role `client`
- Returns success/failure

### 2. BookingsTab — Auto-invite on "Confirmed" (modify)

When admin clicks "Confirmed" status on a booking:
- After updating status, call the `invite-client` edge function with the booking's name, email, and address
- Show toast: "Client invitation sent to [email]"
- Skip if client with that email already has a `client_user_id` (already registered)

### 3. ClientsTab — "Send Setup Email" button (modify)

Add a button on the client detail panel for clients who don't have a `client_user_id`:
- "Send Account Setup Email" button
- Calls the same `invite-client` edge function
- Updates the client record in the UI after success

### 4. ClientsTab — Add `client_user_id` to interface (modify)

Track `client_user_id` in the Client interface so the UI knows whether a client has an account set up (show badge: "Portal Active" vs "No Account").

### 5. ResetPassword page — Minor update

Update the success redirect from `/admin` to detect user role and redirect clients to `/client` instead. Currently it always navigates to `/admin`.

## Database Changes

None — existing schema already supports everything:
- `clients.client_user_id` links to auth users
- `user_roles` table stores roles
- `has_role()` function checks roles

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/invite-client/index.ts` | New edge function |
| `src/components/admin/BookingsTab.tsx` | Call invite on confirm |
| `src/components/admin/ClientsTab.tsx` | Add "Send Setup Email" button, show account status |
| `src/pages/ResetPassword.tsx` | Smart redirect based on role |

