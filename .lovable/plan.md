

# Next Phase: Notifications, Client Portal, Scheduling, and Analytics

This is a large scope covering four areas. We will implement them incrementally, prioritizing foundational work first.

---

## Part 1: Notifications and Comms

Leverage the email infrastructure already set up on `notify.oliveclean.co`.

### 1A. Scaffold transactional email templates
Create branded app email templates for key events:
- **Booking confirmation** — sent to client when a booking request is submitted
- **Job reminder** — sent to client 24h before scheduled job (triggered via cron)
- **Job completed** — sent to client after technician marks job complete
- **Invoice issued** — sent to client when admin creates an invoice

Each template: React Email component in `_shared/transactional-email-templates/`, registered in the TEMPLATES registry, styled with Olive Clean branding.

### 1B. Wire up email triggers
- Booking form (`BookingSection.tsx`) → invoke `send-transactional-email` with `booking-confirmation`
- Employee marks job complete (`EmployeeDashboard.tsx`) → invoke with `job-completed`
- Invoice creation (`InvoicesSection.tsx`) → invoke with `invoice-issued`
- New Edge Function or cron-based trigger for 24h job reminders

### 1C. Unsubscribe page
- Create `/unsubscribe` route with token validation and branded UI

### 1D. Update lifecycle-notify
- Refactor `lifecycle-notify` Edge Function to use the transactional email system instead of just logging

---

## Part 2: Client Portal Enhancements

### 2A. Invoices tab on Client Dashboard
- Query `invoices` table filtered by `client_id`
- Display invoice list with status badges (draft, issued, paid, overdue)
- Expandable invoice detail showing line items, totals, due date

### 2B. Job history improvements
- Add filtering by date range and status
- Show service details, technician name, duration, and price
- Link to feedback form for completed jobs without feedback

### 2C. Account settings section
- Allow clients to update name, phone, email, address
- Password change via Supabase auth `updateUser`

---

## Part 3: Scheduling and Calendar

### 3A. Admin calendar view
- New "Calendar" tab on Admin Dashboard
- Monthly/weekly calendar grid using a lightweight calendar component
- Display jobs as colored blocks by status, clickable for detail
- Filter by technician

### 3B. Employee availability
- New `employee_availability` table: `employee_id`, `day_of_week`, `start_time`, `end_time`, `is_available`
- Admin can set default weekly availability per employee in Team tab
- Auto-Assign respects availability constraints

### 3C. Time-off requests
- New `time_off_requests` table: `employee_id`, `start_date`, `end_date`, `reason`, `status`
- Employee dashboard: submit time-off requests
- Admin Team tab: approve/deny requests
- Calendar view shows time-off blocks

---

## Part 4: Reporting and Analytics Enhancements

### 4A. Expand existing Analytics tab
- **Revenue report**: monthly/weekly breakdown with comparison to prior period
- **Employee productivity**: jobs per technician, avg duration, avg rating (uses `employee_performance` table)
- **Client retention**: new vs returning clients per month, churn indicators

### 4B. Export functionality
- CSV export button for revenue data, job history, client list
- Date range picker for filtered exports

---

## Database Changes (migrations)

1. `employee_availability` table with RLS (admin + own employee read/write)
2. `time_off_requests` table with RLS (employees insert own, admin manages all)

## New Files Summary

- 4 email templates in `_shared/transactional-email-templates/`
- Updated `registry.ts` with all templates
- `/unsubscribe` page component
- `CalendarTab.tsx` admin component
- `AvailabilityManager.tsx` component
- `TimeOffRequests.tsx` component (employee + admin views)
- Updated `ClientDashboard.tsx` with invoices and account settings
- Updated `AnalyticsTab.tsx` with new charts and export

## Implementation Order

1. Transactional email scaffolding and templates (foundation for notifications)
2. Wire email triggers into existing flows
3. Client portal invoice viewing and account settings
4. Calendar tab and availability tables
5. Time-off request flow
6. Analytics enhancements and CSV export

