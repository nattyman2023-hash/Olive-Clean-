

## Finance Role, Dashboard & Stripe Integration

### Overview
Add a new "finance" role, a dedicated Finance Dashboard at `/finance`, and connect Stripe payment data. The employee expense submission flow already exists — we just need to wire approved expenses into the payout calculation.

---

### 1. Database: Add Finance Role & Payout Tracking

**Migration:**
- Add `'finance'` to the `app_role` enum
- Create `payout_records` table to track "Mark as Paid" actions:
  - `id`, `employee_id`, `week_start`, `week_end`, `hours_worked`, `hourly_rate`, `base_pay`, `approved_expenses`, `total_payout`, `paid_at`, `paid_by`, `created_at`
- Add RLS: admin and finance roles get full access to `payout_records`
- Add RLS policies so finance role can SELECT on `employees`, `expenses`, `payslips`, `invoices`, `job_time_logs`, and `jobs` (read-only)
- Add RLS so finance role can UPDATE expenses (for approve/reject)

### 2. Auth: Add Finance Role Detection

**File: `src/hooks/useAuth.tsx`**
- Add `isFinance` boolean state
- Add `has_role` check for `'finance'` alongside existing admin/staff/client checks
- Expose `isFinance` in context

### 3. Finance Dashboard Page

**New file: `src/pages/FinanceDashboard.tsx`**
- Route guard: only accessible to users with `finance` or `admin` role
- Three tabs: **Payouts**, **Customer Payments**, **Expense Approvals**

**Payouts Tab:**
- Table of all active employees
- For each: name, verified clock-in hours (from `job_time_logs` clock_in/clock_out for the selected week), hourly rate (from latest payslip or a default), calculated pay
- Include approved expenses for the week as a separate column added to total
- "Mark as Paid" button → inserts into `payout_records` with timestamp
- Already-paid rows show paid date with a green badge

**Customer Payments Tab:**
- Fetches recent Stripe payment intents via an edge function (to keep the Stripe secret key server-side)
- Shows: customer name/email, amount, date, Stripe transaction ID, status
- Failed payments highlighted in red

**Expense Approvals Tab:**
- Reuses the existing `ExpensesSection` component (already has approve/reject UI)
- When approved, the expense amount is automatically included in the employee's payout calculation

### 4. Stripe Payments Edge Function

**New file: `supabase/functions/list-stripe-payments/index.ts`**
- Accepts optional `limit` and `starting_after` params
- Uses `STRIPE_SECRET_KEY` (already configured) to call Stripe's payment intents API
- Returns formatted list with customer details, amount, status, created date
- CORS headers included

### 5. Routing & Navigation

**File: `src/App.tsx`**
- Add lazy-loaded route for `/finance` → `FinanceDashboard`

**File: `src/components/SmartRedirect.tsx`**
- Add finance role redirect: finance users go to `/finance` when opening the installed app

### 6. Admin Panel: Restricted Access for Finance Role

Finance users who also have admin access already see everything. No changes needed to the admin panel itself — the finance dashboard is a separate, focused view.

---

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `finance` to enum, create `payout_records`, add RLS |
| `src/hooks/useAuth.tsx` | Add `isFinance` role check |
| `src/pages/FinanceDashboard.tsx` | Create — 3-tab dashboard |
| `supabase/functions/list-stripe-payments/index.ts` | Create — Stripe API proxy |
| `src/App.tsx` | Add `/finance` route |
| `src/components/SmartRedirect.tsx` | Add finance redirect |

