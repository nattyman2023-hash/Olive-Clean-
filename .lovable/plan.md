

# Analytics Tab + Admin Account Setup

## 1. Create Admin Account

I'll use the backend to create a user for `natalinog2002@yahoo.com` and assign the admin role. This requires:
- Creating the user in the authentication system
- Inserting a row in `user_roles` with role `admin`

**Note:** I cannot set the password directly — I'll create the user via the backend, but you may need to use the "Forgot Password" flow at `/admin/login` to set the password to `Malta2016@//` if the auto-created password doesn't work. Alternatively, I can enable auto-confirm and sign up the user via code.

## 2. Analytics Tab (`src/components/admin/AnalyticsTab.tsx`)

A new tab in the admin dashboard showing three chart sections using Recharts (already available via the chart UI components):

### Revenue Over Time
- Bar chart showing monthly revenue from `jobs` table (sum of `price` grouped by month for completed jobs)
- Displays total revenue stat card

### Job Completion Rates
- Pie/donut chart showing job status distribution (scheduled, in_progress, completed, cancelled)
- Completion rate percentage stat card

### Client Growth
- Line/area chart showing cumulative client count over time from `clients.created_at`
- Total clients stat card

All data fetched client-side from existing tables — no new database tables needed.

## 3. Dashboard Update (`src/pages/AdminDashboard.tsx`)

- Add "Analytics" tab (admin-only, like Perks)
- Import and render `AnalyticsTab`

## Files
- **Create**: `src/components/admin/AnalyticsTab.tsx`
- **Edit**: `src/pages/AdminDashboard.tsx` — add Analytics tab

## Technical Details
- Uses existing `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from `src/components/ui/chart.tsx`
- Uses Recharts `BarChart`, `PieChart`, `AreaChart` primitives
- Data aggregation done in-component with `useMemo`
- No database migration needed — queries existing `jobs`, `clients` tables

