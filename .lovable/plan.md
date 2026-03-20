

# Olive Clean Ecosystem Expansion — Phased Plan

This covers all four selected features. Given the scope, implementation will be split into two phases to keep each change set manageable.

---

## Phase 1: Feedback System + Perks Engine Enhancements

### 1A. Feedback Table & Post-Service Flow

**Database migration:**
- Create `feedback` table: `id`, `job_id` (FK→jobs), `client_id` (FK→clients), `rating` (integer 1-5), `comments` (text), `created_at`
- RLS: Authenticated admin/staff can SELECT/INSERT/UPDATE. Public can SELECT (anonymized — no client details exposed).
- Add `after_photos` storage bucket for post-service photos.

**Admin dashboard — new Feedback section in Analytics tab:**
- Average rating stat card, rating distribution bar chart
- Recent feedback list with star ratings, comments, and linked job/client
- Ability for admin to view after-photos uploaded per job

**Post-service survey trigger:**
- When a job status changes to "completed", surface a "Request Feedback" button in the Jobs detail panel
- This generates a shareable link (public route `/feedback/:job_id`) where the client can rate 1-5 stars, leave comments, and upload photos

**New files:**
- `src/pages/FeedbackForm.tsx` — public feedback submission page
- Migration SQL for `feedback` table + storage bucket

**Edited files:**
- `src/App.tsx` — add `/feedback/:jobId` route
- `src/components/admin/JobsTab.tsx` — add "Request Feedback" button
- `src/components/admin/AnalyticsTab.tsx` — add feedback stats section

### 1B. Perks Engine Enhancements

**Upgrade the Gap Filler in PerksTab:**
- When a job is cancelled, auto-match active Perks members in the same zone/neighborhood
- Add a "Send Offer" button next to each matched member (prepares an offer with slot time and Perks rate)
- Track offer status: offered → accepted / declined
- "Instant Confirmation" flow: when accepted, auto-create a new job with status "scheduled" for the Perks member at the discounted price

**Database migration:**
- Create `perks_offers` table: `id`, `perks_member_id` (FK→perks_members), `cancelled_job_id` (FK→jobs), `offered_at`, `status` (offered/accepted/declined), `responded_at`, `new_job_id` (FK→jobs, nullable)
- RLS: Admin can SELECT/INSERT/UPDATE

**Edited files:**
- `src/components/admin/PerksTab.tsx` — enhanced Gap Filler with offer tracking and instant confirmation

---

## Phase 2: Employee Portal + Client-Facing Portal

### 2A. Employee Portal

**Database migration:**
- Create `employees` table: `id`, `user_id` (FK→auth.users), `name`, `phone`, `status` (active/onboarding/inactive), `certifications` (jsonb), `hired_at`, `notes`
- Create `employee_performance` table: `id`, `employee_id` (FK→employees), `month` (date), `jobs_completed`, `recleans`, `avg_rating`, `avg_efficiency_pct`, `attendance_score`
- RLS: Admin can full CRUD; staff can SELECT own records

**Admin dashboard — new "Team" tab:**
- Employee list with status badges, search/filter
- Add/edit employee form with certifications tracker
- Performance dashboard per employee: completion rate, re-clean rate, efficiency (actual vs estimated duration), client satisfaction from feedback
- Onboarding checklist tracker (documentation, training, policy, supplies)

**New files:**
- `src/components/admin/TeamTab.tsx`

**Edited files:**
- `src/pages/AdminDashboard.tsx` — add Team tab

### 2B. Client-Facing Portal

**New routes and pages:**
- `/client/login` — client authentication (email/password)
- `/client` — client dashboard showing upcoming jobs, past jobs, preferences editor, invoices

**Database changes:**
- Add `client_user_id` column to `clients` table (nullable uuid) to link a client record to an auth user
- Add new role `client` to the `app_role` enum
- RLS policies: clients can SELECT their own records from `clients`, `jobs`, and `feedback`

**New files:**
- `src/pages/ClientLogin.tsx`
- `src/pages/ClientDashboard.tsx`

**Edited files:**
- `src/App.tsx` — add client routes
- `src/components/Navbar.tsx` — add "Client Login" link
- `src/components/Footer.tsx` — add "Client Portal" link

---

## Implementation Order

Phase 1 (this implementation cycle): Feedback system + Perks Engine — 2 migrations, 1 new page, 3 edited components
Phase 2 (next cycle): Employee portal + Client portal — 2 migrations, 3 new pages, 3 edited files

## Technical Notes
- All new tables use RLS with the existing `has_role()` security definer function
- Storage bucket for after-photos uses authenticated upload with admin/staff read access
- No external API keys needed for Phase 1
- Phase 2 client portal requires adding `client` to the `app_role` enum via migration

