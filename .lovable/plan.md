

# Email Touchpoint Audit — Complete Results

## Currently Wired (13 triggers working)

| Touchpoint | Template | Triggered From |
|---|---|---|
| Booking confirmed by admin | `booking-confirmation` | BookingsTab |
| Client self-books | `booking-confirmation` | BookingSection |
| Client signs up | `welcome` | ClientLogin |
| Client added by admin | `client-added` | ClientsTab |
| Employee invited | `employee-welcome` | invite-employee Edge Function |
| Job assigned to employee | `job-assigned` | JobsTab (create + reassign) |
| Job completed | `job-completed` | EmployeeDashboard |
| Invoice sent | `invoice-issued` | InvoicesSection |
| Estimate sent | `estimate-sent` | EstimatesSection |
| Time-off approved | `time-off-approved` | TimeOffManager |
| Time-off denied | `time-off-denied` | TimeOffManager |
| Job reminder (24h before) | `job-reminder` | send-job-reminders cron |
| Admin daily digest | `admin-daily-digest` | send-admin-digest cron |

---

## Missing Email Triggers (7 gaps found)

### 1. **Booking request submitted (public form)** — `BookPage.tsx`
When a prospect submits the public booking form, they get a toast but no confirmation email. Should send a "We received your request" email to the submitter.
- Template needed: `booking-request-received`
- Trigger: after successful insert in `BookPage.tsx`

### 2. **Job application submitted** — `Careers.tsx`
Applicants submit a resume and cover note but receive no confirmation. Should send "We received your application" email.
- Template needed: `application-received`
- Trigger: after successful insert in `Careers.tsx`

### 3. **Applicant hired / moved to team** — `HiringTab.tsx`
When admin clicks "Move to Team", the applicant is converted to an employee record but gets no notification. Should send "Congratulations, you've been hired" email.
- Template needed: `applicant-hired`
- Trigger: in `moveToTeamMutation` onSuccess in `HiringTab.tsx`

### 4. **Feedback submitted by client** — `FeedbackForm.tsx`
After a client submits a rating + comments, there's no acknowledgment email. Should send "Thanks for your feedback" email.
- Template needed: `feedback-thank-you`
- Trigger: after successful insert in `FeedbackForm.tsx`

### 5. **Questionnaire completed** — `Questionnaire.tsx`
Client fills out home details (gate codes, pets, etc.) but gets no confirmation. Should send "We've saved your home details" email.
- Template needed: `questionnaire-completed`
- Trigger: after successful update in `Questionnaire.tsx`

### 6. **Password changed** — `ClientAccountSettings.tsx` and `ResetPassword.tsx`
When a user changes their password via account settings or the reset flow, no confirmation email is sent. Should send a security notification.
- Template needed: `password-changed`
- Trigger: after successful `updateUser({ password })` in both files

### 7. **Job cancelled or rescheduled** — `JobsTab.tsx`
Jobs can be updated (status changes, reassigned) but there's no email to the client when their job is rescheduled or cancelled. Should notify the client.
- Template needed: `job-update`
- Trigger: when job status changes or scheduled date is modified in `JobsTab.tsx`

---

## Implementation Summary

| Action | Files |
|---|---|
| Create 7 new email templates | `_shared/transactional-email-templates/` |
| Update registry | `registry.ts` — add 7 new entries |
| Wire triggers | `BookPage.tsx`, `Careers.tsx`, `HiringTab.tsx`, `FeedbackForm.tsx`, `Questionnaire.tsx`, `ClientAccountSettings.tsx`, `ResetPassword.tsx`, `JobsTab.tsx` |
| Deploy | Redeploy `send-transactional-email` after registry update |

All 7 templates will follow the existing Olive Clean brand style (same colors, layout, fonts as the current templates). Each trigger will include an `idempotencyKey` for deduplication safety.

