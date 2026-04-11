

## Finance Dashboard: Interactive Drill-Down, Inline Editing, Auth Header, and Permission Sync

This is a large scope request. To keep it manageable and deliverable, I will focus on the highest-impact items first and defer the "nice-to-have" analytics features (Profitability Heatmap, Cash Flow Forecasting, Dispute Center, Gross Margin) for a follow-up iteration.

---

### Phase 1: Core Interactivity (This Implementation)

#### 1. Slide-Over Drawers for Payout, Payment, and Expense Details

The PayoutsSection already has an expandable row with detail data. We will upgrade this to use a **Sheet (slide-over panel)** instead, and add the same pattern to Customer Payments and Expenses.

**Payouts Drawer** — clicking a row opens a Sheet showing:
- Clock sessions with timestamps
- Completed jobs with service name, client name, and tip
- Approved expenses with receipt link
- Linked payout record if already paid

**Payments Drawer** — clicking a payment row opens a Sheet showing:
- Stripe transaction ID, status, date
- Customer name/email
- Linked invoice (query `invoices` by matching amount/client)
- Tip breakdown

**Expenses Drawer** — clicking an expense row opens a Sheet showing:
- Full description, category, amount
- Receipt image (rendered from `receipt_url`)
- Submitter name, submission date
- Review status and reviewer notes

#### 2. Inline Editing on Payouts

- Add an "Edit Mode" toggle button to the Payouts tab header
- When active, `hours_worked` and `tips` cells become `<Input>` fields
- A "Save" and "Cancel" button appear in each edited row
- On save: update the `job_time_logs` or recalculate and persist an adjustment record
- **Audit trail**: Create a new `payout_adjustments` table to log every manual change with `changed_by`, `old_value`, `new_value`, `field_name`, `changed_at`

**Database migration**:
```sql
CREATE TABLE public.payout_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  field_name text NOT NULL,
  old_value numeric NOT NULL,
  new_value numeric NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.payout_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access payout_adjustments"
  ON public.payout_adjustments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance full access payout_adjustments"
  ON public.payout_adjustments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'finance'))
  WITH CHECK (has_role(auth.uid(), 'finance'));
```

#### 3. Global Auth Header for Finance Dashboard

The Finance Dashboard currently has no persistent header. Add:
- Olive Clean logo (left) + "Finance Dashboard" title
- User profile area (right): avatar with initials, role badge (`[FINANCE]` or `[ADMIN]`), dropdown with:
  - Account Settings (link to password change)
  - Logout button (calls `supabase.auth.signOut()`, redirects to `/`)

#### 4. Permission Sync Fix

The `usePermissions` hook caches resolved permissions using `resolvedRef`. When permissions change in the DB, users don't see updates until they log out.

**Fix**: Clear `resolvedRef.current` on tab/section navigation so permissions are re-fetched. Add a Supabase Realtime subscription on `role_permissions` table changes to auto-refresh.

**Database migration**: Enable realtime on `role_permissions`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
```

---

### Files Summary

| File | Action |
|------|--------|
| `src/pages/FinanceDashboard.tsx` | Add auth header with user profile dropdown, role badge, and logout; upgrade PayoutsTab to use Sheet drawers; add inline editing mode |
| `src/components/admin/finance/PayoutsSection.tsx` | Replace expandable rows with Sheet drawer; add inline edit mode with save/cancel; show audit trail in drawer |
| `src/components/admin/finance/ExpensesSection.tsx` | Make rows clickable → Sheet drawer with receipt image and full details |
| `src/hooks/usePermissions.ts` | Add Realtime listener on `role_permissions`; clear cache on changes |
| Database migration | Create `payout_adjustments` table with RLS; enable realtime on `role_permissions` |

### Deferred to Next Iteration
- Reconciliation view (Stripe payouts vs app invoices)
- Tax Management (1099/W-2 year-end reporting)
- Refund Module
- Gross Margin / Profitability charts
- Cash Flow Forecasting
- Dispute Center

