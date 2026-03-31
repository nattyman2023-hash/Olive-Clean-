

# Next Phase: Dashboard Role Guards, Auth Stability, and Missing Emails

## Overview

Three workstreams: (1) enforce role-based access on dashboards and login pages, (2) eliminate auth flickering by caching roles across token refreshes, (3) create and wire four missing email templates plus a daily job reminder cron.

---

## 1. Dashboard Role Guards

### `src/hooks/useAuth.tsx` — Cache roles, skip TOKEN_REFRESHED
- Track `resolvedUserId` ref to know which user's roles are cached
- On `TOKEN_REFRESHED` (same user), skip `checkRoles` entirely — no `rolesLoading` toggle
- On `SIGNED_IN` with a different user, re-check roles
- On `SIGNED_OUT`, clear roles and `resolvedUserId`

### `src/pages/AdminDashboard.tsx` — Role guard
- Wait for both `authLoading` and `rolesLoading` to finish
- If user is logged in but lacks `isAdmin` AND `isStaff`, redirect to `/` with toast "You don't have access to this dashboard"

### `src/pages/ClientDashboard.tsx` — Role guard
- Wait for both `authLoading` and `rolesLoading` to finish
- If user is logged in but lacks `isClient`, redirect to `/` with toast

### `src/pages/EmployeeDashboard.tsx` — Already guarded (no change)

### Login pages — Role-aware redirect after sign-in

**`AdminLogin.tsx`**: After `signInWithPassword` succeeds, call `has_role` RPC for admin and staff. Redirect to `/admin` if admin/staff, `/client` if client role, `/employee` if staff. Show error if no role found.

**`ClientLogin.tsx`**: After login, check client role. If admin/staff instead, redirect to `/admin`. If no role, show error.

**`EmployeeLogin.tsx`**: After login, check staff role. If client, redirect to `/client`. If admin, redirect to `/admin`.

---

## 2. Missing Email Templates

Four new templates in `supabase/functions/_shared/transactional-email-templates/`, all matching the existing Olive Clean brand style (same colors, fonts, layout as `welcome.tsx`).

### a) `employee-welcome.tsx`
- Subject: "Welcome to the Olive Clean team!"
- Content: greeting with employee name, instructions to set up portal password
- Triggered in `supabase/functions/invite-employee/index.ts` after successful account creation/invite, using `send-transactional-email`

### b) `client-added.tsx`
- Subject: "Welcome to Olive Clean!"
- Content: greeting, info about client portal availability
- Triggered in `src/components/admin/ClientsTab.tsx` `saveClient()` when creating a new client (not editing), only if client has an email

### c) `time-off-denied.tsx`
- Subject: "Time-off request update"
- Content: "Your request for [start] - [end] was not approved", with optional reason
- Currently `TimeOffManager.tsx` already sends `time-off-approved` template for ALL status changes (approve and deny). Fix: send `time-off-denied` template when status is "denied", keep `time-off-approved` for "approved"

### d) `estimate-sent.tsx`
- Subject: "You have a new estimate from Olive Clean"
- Content: estimate number, total, valid-until date, CTA to view
- Triggered in `src/components/admin/finance/EstimatesSection.tsx` `updateStatus()` when status changes to "sent". Need to look up client email from the estimate's `client_id`

### Registry update
- Add all four templates to `registry.ts`

---

## 3. Job Reminder Cron

### `supabase/functions/send-job-reminders/index.ts` (new)
- Query jobs scheduled in the next 24 hours with status "scheduled"
- For each job, look up client email via `client_id`
- Call `send-transactional-email` with `job-reminder` template (already exists)
- Use `idempotencyKey: job-reminder-${job.id}` to prevent duplicates

### `supabase/functions/send-job-reminders/deno.json` (new)
- Empty config `{}`

### `supabase/config.toml`
- Add `[functions.send-job-reminders]` with `verify_jwt = true`

### Database: pg_cron job
- Schedule daily at 7 AM CT to invoke `send-job-reminders`

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Cache roles, skip re-check on TOKEN_REFRESHED |
| `src/pages/AdminDashboard.tsx` | Add role guard redirect |
| `src/pages/ClientDashboard.tsx` | Add role guard redirect |
| `src/pages/AdminLogin.tsx` | Role-aware post-login redirect |
| `src/pages/ClientLogin.tsx` | Role-aware post-login redirect |
| `src/pages/EmployeeLogin.tsx` | Role-aware post-login redirect |
| `_shared/transactional-email-templates/employee-welcome.tsx` | New |
| `_shared/transactional-email-templates/client-added.tsx` | New |
| `_shared/transactional-email-templates/time-off-denied.tsx` | New |
| `_shared/transactional-email-templates/estimate-sent.tsx` | New |
| `_shared/transactional-email-templates/registry.ts` | Register 4 new templates |
| `supabase/functions/invite-employee/index.ts` | Trigger employee-welcome email |
| `src/components/admin/ClientsTab.tsx` | Trigger client-added email on create |
| `src/components/admin/TimeOffManager.tsx` | Send denied template on deny |
| `src/components/admin/finance/EstimatesSection.tsx` | Trigger estimate-sent email |
| `supabase/functions/send-job-reminders/index.ts` | New cron function |
| `supabase/functions/send-job-reminders/deno.json` | New |
| `supabase/config.toml` | Add send-job-reminders config |
| DB (via insert tool) | pg_cron job for daily 7 AM reminder |

