

## Finance Dashboard Enhancements: Pay Types, Tips, Worker Classification & CSV Export

### Overview
Four interconnected changes to the employee pay system and finance dashboard: support for hourly vs. flat-rate pay, automatic Stripe tip tracking, contractor/W2 classification, and a payroll CSV export button.

---

### 1. Database Changes (Single Migration)

**Add columns to `employees` table:**
- `pay_type TEXT NOT NULL DEFAULT 'hourly'` — either `'hourly'` or `'per_job'`
- `fixed_job_rate NUMERIC` — the flat dollar amount when pay_type is `'per_job'`
- `worker_classification TEXT NOT NULL DEFAULT 'w2'` — either `'w2'` or `'contractor'`

**Add columns to `payout_records` table:**
- `tips NUMERIC NOT NULL DEFAULT 0`
- `pay_type TEXT NOT NULL DEFAULT 'hourly'`

**Add columns to `jobs` table:**
- `tip_amount NUMERIC DEFAULT 0` — tip received for this specific job

**RLS:** Existing policies on `employees`, `payout_records`, and `jobs` already cover admin/finance access. No new policies needed.

---

### 2. Admin Team Tab: Employee Pay Settings

**File: `src/components/admin/TeamTab.tsx`**

In the employee edit form, add:
- **Pay Type** dropdown: "Hourly" or "Fixed Per Job"
- **Fixed Rate** input (visible only when "Fixed Per Job" is selected)
- **Worker Classification** toggle: "W2 / Staff" or "Contractor"

These fields save to the new `employees` columns.

---

### 3. Stripe Tip Extraction

**File: `supabase/functions/stripe-webhook/index.ts`**

When handling `checkout.session.completed`, also read the tip amount from `session.metadata.tip_amount` (if present) and save it to the `jobs.tip_amount` column using the `job_id` from metadata.

**File: `supabase/functions/list-stripe-payments/index.ts`**

Include `metadata` in the Stripe API response mapping so the finance dashboard can display tip amounts extracted from payment intents.

---

### 4. Finance Dashboard: Enhanced Payouts Tab

**File: `src/pages/FinanceDashboard.tsx`**

Update `PayoutsTab` to:
- Fetch `pay_type`, `fixed_job_rate`, `worker_classification` from `employees`
- For **hourly** employees: calculate as today (hours × rate)
- For **per_job** employees: count completed jobs for the week, multiply by `fixed_job_rate`
- Fetch `tip_amount` from completed `jobs` for the week and sum per employee
- Add columns to the table: **Pay Method** (badge: "Hourly" or "Per Job"), **Tips**, and update **Total** to include tips
- Show worker classification as a small badge (W2 / 1099) next to the employee name
- Store `tips` and `pay_type` in `payout_records` when marking as paid

---

### 5. CSV Export Button

**File: `src/pages/FinanceDashboard.tsx`**

Add a "Download Payroll Report" button above the payouts table that:
- Generates a CSV with columns: Employee Name, Classification, Pay Method, Hours Worked, Pay Rate, Base Pay, Tips, Expenses, Total Owed
- Uses `Blob` + `URL.createObjectURL` for client-side download (no server needed)
- Filename: `payroll_YYYY-MM-DD.csv`

---

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `pay_type`, `fixed_job_rate`, `worker_classification` to employees; `tips`, `pay_type` to payout_records; `tip_amount` to jobs |
| `src/components/admin/TeamTab.tsx` | Add pay type, fixed rate, and worker classification fields to employee edit form |
| `supabase/functions/stripe-webhook/index.ts` | Save tip_amount from session metadata to jobs |
| `supabase/functions/list-stripe-payments/index.ts` | Include tip metadata in response |
| `src/pages/FinanceDashboard.tsx` | Enhanced payouts with pay method logic, tips column, classification badges, CSV export |

