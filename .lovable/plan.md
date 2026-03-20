
# Client Account Setup Flow — Implemented ✅

## What was built

1. **Edge Function `invite-client`** — Creates auth user via `inviteUserByEmail()`, assigns `client` role, links/creates client record
2. **BookingsTab** — Auto-sends setup email when admin confirms a booking
3. **ClientsTab** — Shows "Portal Active" / "No Account" badge, "Send Account Setup Email" button for clients without accounts
4. **ResetPassword** — Redirects to `/client` for client role, `/admin` for admin role

# Next Phase — Implemented ✅

## 1. Applicant Tracking System
- `applicants` table with RLS (public insert, admin/staff read)
- `resumes` storage bucket for resume uploads
- `/careers` public page — application form with resume upload
- `HiringTab` admin component — pipeline with status filters, notes, "Move to Team" button

## 2. Client Lifecycle Automation
- `lifecycle_events` table to track sent notifications (prevents duplicates)
- `lifecycle-notify` edge function — records events, prevents duplicates
- `/questionnaire/:clientId` page — pre-service questionnaire saving to client preferences
- BookingsTab triggers welcome event on confirmation

## 3. Route Optimization UI
- `lat`/`lng` columns on clients, `estimated_drive_minutes` on jobs
- `RoutesTab` admin component — date picker, jobs grouped by technician, zone-colored cards by neighborhood

## 4. Branded Auth Emails
- ⏳ Pending — email domain needs to complete setup first
