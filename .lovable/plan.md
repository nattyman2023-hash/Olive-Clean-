

## Feedback Loop, Time Off Details, Associative Navigation, and Automated Feedback Reminders

### What's Already Done
- Send Feedback Request button (email) on Job detail ✓
- Quote → Job conversion ✓
- Admin expense addition + re-evaluate ✓
- Resend Invoice ✓
- Time Off drawer with alter decision ✓
- Dismissible low stock banner ✓
- Job posting CRUD (edit/archive) ✓

### What's New in This Request

#### 1. Feedback → Technician Association
The `feedback` table has no `employee_id` column. When feedback is submitted via `/feedback/:jobId`, the technician who did the job isn't linked.

**Database**: Add `employee_id` column to `feedback` table.

**FeedbackForm.tsx**: When submitting, look up `jobs.assigned_to` and store it as `employee_id` in the feedback record.

**JobDetailPanel (JobsTab.tsx)**: In the "Client Feedback" section, query and display the feedback rating/comments for the current job inline.

**TeamTab.tsx**: On the employee profile/detail view, add a "Reviews" section that aggregates all feedback where `employee_id` matches.

#### 2. Time Off Request Notes/Description
The `time_off_requests` table has a `reason` column (text) but it may not be surfaced well.

**TimeOffManager.tsx**: Ensure the request form has a multi-line textarea for the reason field, and that the admin drawer displays the full reason text prominently.

#### 3. Associative Navigation (Hyperlinking)
Make names and IDs clickable across the app:

**JobsTab.tsx**: Technician name in job list/detail → clickable, switches to Team tab and selects that employee.
**JobsTab.tsx**: Client name → clickable, switches to Clients tab.
**Finance sections**: Invoice/expense rows show linked job reference → clickable.
**RecentUploads.tsx**: Photo thumbnails show linked job ID → clickable.
**HiringTab.tsx**: Applicant row shows which job posting they applied to → clickable.

Implementation: Use a callback prop pattern (e.g., `onNavigate(tab, id)`) from AdminDashboard to switch tabs and pre-select items.

#### 4. Automated Feedback Reminder (Edge Function + Cron)
No `feedback_email_sent` column exists. Need a daily cron that nudges clients who haven't left feedback.

**Database**: Add `feedback_email_sent` boolean column (default false) to `jobs` table.

**Edge Function**: Create `send-feedback-reminders/index.ts`:
- Query jobs where `status = 'completed'`, `completed_at < now() - interval '24 hours'`, no matching `feedback` record, and `feedback_email_sent = false`.
- For each, send `feedback-request` transactional email with the feedback URL.
- Set `feedback_email_sent = true`.

**Cron**: Schedule via pg_cron to run daily at 9 AM CT.

---

### Files Summary

| File | Action |
|------|--------|
| Database migration | Add `employee_id` to `feedback`; add `feedback_email_sent` to `jobs` |
| `src/pages/FeedbackForm.tsx` | Store `employee_id` (from `jobs.assigned_to`) when submitting |
| `src/components/admin/JobsTab.tsx` | Display feedback on job detail; make technician/client names clickable |
| `src/components/admin/TeamTab.tsx` | Add "Reviews" aggregation section on employee profile |
| `src/components/admin/TimeOffManager.tsx` | Ensure reason textarea in form and full display in drawer |
| `src/components/admin/finance/InvoicesSection.tsx` | Make job/client references clickable |
| `src/components/admin/finance/ExpensesSection.tsx` | Make employee reference clickable |
| `src/components/admin/RecentUploads.tsx` | Make job reference clickable |
| `src/components/admin/HiringTab.tsx` | Show linked job posting on applicant rows |
| `src/pages/AdminDashboard.tsx` | Add cross-tab navigation callback support |
| `supabase/functions/send-feedback-reminders/index.ts` | New edge function for automated 24h feedback nudge |
| Cron job (SQL insert) | Schedule daily 9 AM CT execution |

