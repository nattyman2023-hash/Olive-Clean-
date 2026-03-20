

# Next Phase: Four Features

All four features will be built in sequence. Here is the plan for each.

---

## 1. Client Lifecycle Automation

Automated welcome and post-service follow-up workflows.

### Database Changes
- New `lifecycle_events` table to track sent notifications (prevents duplicates):
  - `id`, `client_id`, `job_id` (nullable), `event_type` (welcome, follow_up_24h), `sent_at`, `channel` (email/sms)

### Edge Function: `lifecycle-notify`
- Accepts `{ event_type, client_id, job_id? }`
- "welcome" event: sends welcome email with pre-service questionnaire link and team info
- "follow_up_24h" event: sends satisfaction check email 24 hours after job completion
- Uses Lovable email infrastructure (enqueue to pgmq)

### BookingsTab Changes
- When booking status changes to "confirmed", also trigger welcome lifecycle event (in addition to existing invite flow)

### JobsTab Changes
- When job status changes to "completed", schedule a 24-hour follow-up notification
- Use a pg_cron job that checks for completed jobs older than 24h without a follow-up event

### New Page: `/questionnaire/:clientId`
- Pre-service questionnaire form (home details, pet info, special instructions)
- Saves responses to client `preferences` JSONB field
- Accessible without login (uses a signed token from the welcome email)

---

## 2. Applicant Tracking System (ATS)

Replace the hiring email alias with an integrated recruitment pipeline.

### Database Changes
- New `applicants` table:
  - `id`, `name`, `email`, `phone`, `resume_url` (nullable), `status` (applied, screening, interview, hired, rejected), `applied_at`, `notes`, `screening_score` (nullable), `created_at`

### New Public Page: `/careers`
- Application form: name, email, phone, resume upload, cover note
- Uploads resume to a new `resumes` storage bucket
- Inserts into `applicants` table (public insert RLS)

### New Admin Tab: "Hiring"
- List of applicants with status filters (applied, screening, interview, hired, rejected)
- Click to view applicant details, update status, add notes
- "Move to Team" button for hired applicants — creates an employee record and transitions status

### AdminDashboard Changes
- Add "Hiring" tab alongside existing tabs

---

## 3. Route Optimization UI

Geographic clustering view for daily technician schedules.

### Database Changes
- Add `lat` and `lng` columns to `clients` table (nullable numeric) for geocoding
- Add `estimated_drive_minutes` to `jobs` table (nullable integer)

### New Admin Tab: "Routes"
- Date picker to select a day
- Shows scheduled jobs grouped by assigned technician
- Each job card shows: client name, address, neighborhood, time, service type
- Drag-and-drop reordering within a technician's route
- Saves reordered sequence back to `scheduled_at` times
- Zone visualization: color-coded cards by neighborhood (Belle Meade, Brentwood, Franklin, etc.)
- Summary stats: total jobs, estimated drive time, technician utilization

### Edge Function: `optimize-route` (future enhancement placeholder)
- For now, the UI provides manual reordering with neighborhood grouping
- Can later integrate Google Maps API for automated optimization

---

## 4. Branded Auth Emails

Custom Olive Clean-styled emails for invites, password resets, and confirmations.

### Approach
- Email domain `notify.wubhairstudio.co.uk` is already configured (pending DNS)
- Scaffold auth email templates using the managed flow
- Apply Olive Clean brand styling:
  - Primary: `hsl(62, 24%, 41%)` (olive green)
  - Background: white (`#ffffff`)
  - Foreground: `hsl(0, 0%, 18%)`
  - Font: Poppins with Arial fallback
  - Border radius: `0.75rem`
- Check for logo in `public/` directory
- Match the app's tone (professional, warm, trust-focused)
- Deploy `auth-email-hook` edge function

### Templates Customized
- Signup confirmation
- Password recovery
- Invite (client account setup)
- Magic link, email change, reauthentication

---

## Files Changed Summary

| Area | Files |
|------|-------|
| Lifecycle | New edge function, migration, BookingsTab, JobsTab, new Questionnaire page |
| ATS | New migration, new `/careers` page, new HiringTab component, AdminDashboard |
| Routes | Migration (lat/lng), new RoutesTab component, AdminDashboard |
| Emails | Scaffolded templates in `_shared/email-templates/`, `auth-email-hook`, deploy |
| Routing | `App.tsx` — add `/careers` and `/questionnaire/:clientId` routes |

---

## Implementation Order

1. Branded auth emails (quick win — scaffold + style + deploy)
2. Applicant tracking system (new table + public form + admin tab)
3. Client lifecycle automation (edge function + cron + questionnaire)
4. Route optimization UI (migration + admin tab)

