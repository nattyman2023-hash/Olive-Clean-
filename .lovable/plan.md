
# Client Account Setup Flow — Implemented ✅

## What was built

1. **Edge Function `invite-client`** — Creates auth user via `inviteUserByEmail()`, assigns `client` role, links/creates client record
2. **BookingsTab** — Auto-sends setup email when admin confirms a booking
3. **ClientsTab** — Shows "Portal Active" / "No Account" badge, "Send Account Setup Email" button for clients without accounts
4. **ResetPassword** — Redirects to `/client` for client role, `/admin` for admin role
