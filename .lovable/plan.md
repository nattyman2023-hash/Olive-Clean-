

## Fix Finance Data Visibility and Add Payouts to Admin Finance Tab

### Problem Analysis

1. **No Payouts tab in Admin Finance**: The admin's Finance section (`FinanceTab.tsx`) only shows Invoices, Estimates, Payslips, and Expenses. The Payouts tab (with payroll calculations from time logs) only exists on the standalone `/finance` page (`FinanceDashboard.tsx`). As a super admin on `/admin`, you never see the payroll data.

2. **Job status mismatch bug**: The Payouts tab queries jobs with `.eq("status", "completed")`, but the actual job records use `"complete"` as the status value. This means tips and job counts always return 0, making payroll data appear empty even when time logs exist.

### Changes

#### 1. Fix job status filter in `FinanceDashboard.tsx`
- Line 104: Change `.eq("status", "completed")` to `.eq("status", "complete")`

#### 2. Add Payouts tab to the Admin Finance section
- Extract the `PayoutsTab` component from `FinanceDashboard.tsx` into a shared file (or import it directly)
- Add a "Payouts" tab to `FinanceTab.tsx` alongside the existing Invoices/Estimates/Payslips/Expenses tabs
- Pass `readOnly` prop so non-edit users can view but not mark payouts as paid

### Files Summary

| File | Action |
|------|--------|
| `src/pages/FinanceDashboard.tsx` | Fix `"completed"` → `"complete"` status filter |
| `src/components/admin/FinanceTab.tsx` | Add Payouts tab, import PayoutsTab component |
| `src/components/admin/finance/PayoutsSection.tsx` | New file — extract PayoutsTab logic from FinanceDashboard for reuse |

