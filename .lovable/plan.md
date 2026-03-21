

# Plan: Jobs Map View, Financial Documents, Payslips & Employee Expenses

This is a large feature set. Here's the breakdown across 6 areas.

---

## 1. Map View in Admin Jobs Tab

Add a toggle (list/map) to the Jobs tab toolbar. When "Map" is selected, render a Leaflet map (reusing the existing `RouteMap` pattern) showing all filtered jobs with colored markers. Clicking a marker opens a popup with client name, service, time, and assigned tech.

**File:** `src/components/admin/JobsTab.tsx`
- Add `viewMode` state (`"list" | "map"`)
- Add toggle buttons in the toolbar (List / Map icons)
- Fetch `clients(name, neighborhood, lat, lng)` instead of just `clients(name, neighborhood)`
- When `viewMode === "map"`, render a new `JobsMap` component instead of the job cards list
- Filter applies to both views

**New file:** `src/components/admin/jobs/JobsMap.tsx`
- Leaflet map similar to `RouteMap` but simpler — markers for each job with coordinates
- Color-coded by status (scheduled=amber, in_progress=blue, completed=green, cancelled=red)
- Popup shows client name, service, time, assigned tech

---

## 2. Faster Client Creation

The client creation itself is a simple insert — the perceived slowness is likely the full `fetchClients()` reload after save. Optimize by:
- Adding the new client to state optimistically before refetching
- Adding a loading spinner on the Save button (already has `saving` state, just ensure it's visible)
- No schema changes needed

**File:** `src/components/admin/ClientsTab.tsx`

---

## 3. Invoices & Estimates

### Database changes (migration)
Create two new tables:

```sql
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  job_id uuid,
  estimate_id uuid,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  due_date date,
  issued_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  estimate_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  valid_until date,
  converted_invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: Admin full access on both tables. Clients can view own records.

### New admin tab: "Finance"
**New file:** `src/components/admin/FinanceTab.tsx`
- Sub-tabs: Invoices | Estimates | Payslips | Expenses
- **Invoices sub-tab**: List invoices, create new (select client, add line items with description/qty/rate, auto-calculate totals), change status (draft → sent → paid)
- **Estimates sub-tab**: List estimates, create new (same line-item form), "Convert to Invoice" button that copies items into a new invoice and links `estimate_id`
- Each document shows a printable/PDF-friendly preview

**Files:**
- `src/components/admin/finance/InvoicesSection.tsx`
- `src/components/admin/finance/EstimatesSection.tsx`
- `src/components/admin/finance/InvoiceForm.tsx` (shared form for both)
- `src/components/admin/finance/InvoicePreview.tsx` (printable view)

### Admin Dashboard update
**File:** `src/pages/AdminDashboard.tsx`
- Add "Finance" tab to `ADMIN_TABS` (adminOnly: true)

---

## 4. Payslip Generator

### Database changes (migration)
```sql
CREATE TABLE public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  hours_worked numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  calculated_amount numeric NOT NULL DEFAULT 0,
  custom_amount numeric,
  deductions jsonb DEFAULT '[]',
  additions jsonb DEFAULT '[]',
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: Admin full access. Staff can view own payslips (via employee_id join).

### Payslips sub-tab in Finance
**New file:** `src/components/admin/finance/PayslipsSection.tsx`
- Select employee, date range
- Auto-calculate hours from completed jobs in that period
- Show calculated amount (hours × rate)
- "Override" toggle to enter a custom amount
- Add deductions/additions as line items
- Generate payslip with printable preview

---

## 5. Employee Expenses

### Database changes (migration)
```sql
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: Staff can insert and view own expenses. Admin full access.

Storage: Create a `receipts` bucket (public: false) for receipt uploads.

### Employee Dashboard — Expenses section
**File:** `src/pages/EmployeeDashboard.tsx`
- Add an "Expenses" section/card
- Form: amount, category (fuel, supplies, equipment, other), description, receipt upload
- List of submitted expenses with status badges (pending/approved/rejected)

### Admin Finance — Expenses sub-tab
**New file:** `src/components/admin/finance/ExpensesSection.tsx`
- List all employee expenses
- Approve/reject with notes
- View attached receipts
- Filter by employee, status, date range

---

## Summary of Files

| File | Change |
|------|--------|
| `src/components/admin/JobsTab.tsx` | Add map/list toggle, fetch lat/lng |
| `src/components/admin/jobs/JobsMap.tsx` | New — Leaflet map for jobs |
| `src/components/admin/ClientsTab.tsx` | Optimistic insert for faster UX |
| `src/components/admin/FinanceTab.tsx` | New — Finance tab with sub-tabs |
| `src/components/admin/finance/InvoicesSection.tsx` | New — Invoice CRUD |
| `src/components/admin/finance/EstimatesSection.tsx` | New — Estimates + convert to invoice |
| `src/components/admin/finance/InvoiceForm.tsx` | New — Shared line-item form |
| `src/components/admin/finance/InvoicePreview.tsx` | New — Printable document view |
| `src/components/admin/finance/PayslipsSection.tsx` | New — Payslip generator |
| `src/components/admin/finance/ExpensesSection.tsx` | New — Admin expense review |
| `src/pages/AdminDashboard.tsx` | Add Finance tab |
| `src/pages/EmployeeDashboard.tsx` | Add expense submission section |
| Migration | 4 new tables: invoices, estimates, payslips, expenses + receipts bucket |

