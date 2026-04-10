

## Populate Demo Finance Data and Add Payout Detail View

### Problem
1. **Payouts show $0.00 base pay** — The PayoutsSection gets hourly rates from the `payslips` table, but only one employee (Aisha) has payslip records, and those have `hourly_rate: 12` with `hours_worked: 0`. The other employees (Yonas, Siye, Maria) have no payslips at all, so their rate resolves to $0.
2. **No sample payslips** — Only 2 empty draft payslips exist. Nothing meaningful to view or demo.
3. **No way to see payout details or send payslips** — The Payouts table shows a summary row per employee but no expandable detail view. Payslips have no "send" action.

### Changes

#### 1. Database: Seed demo payslips for all active employees
Insert realistic payslips for the past 4 weeks for each active employee (Aisha, Yonas, Siye) with proper hourly rates ($22-$28/hr) and hours worked (25-40 hrs/week). This gives the Payouts section rate data and gives the Payslips tab visible records.

Also seed a few sample invoices and expenses so the Finance tab looks populated for the demo.

#### 2. Fix PayoutsSection hourly rate fallback
Currently if no payslip exists, the rate is $0. Add a fallback: if no payslip rate is found, use a default rate (e.g. $25/hr) so the Payouts table always shows meaningful calculations from time log data.

#### 3. Add expandable payout detail row
When clicking an employee row in the Payouts table, show a detail panel with:
- Breakdown of clock-in/out sessions for that week
- Individual job completions with tip amounts
- Expense line items
- Option to generate a payslip from this payout data

#### 4. Add "Send Payslip" action to PayslipsSection
Add a button on each payslip to mark it as "sent" (updates status to `sent`) and optionally email it to the employee. For demo purposes, just update the status.

### Files Summary

| File | Action |
|------|--------|
| Database migration | Insert demo payslips with realistic data for all employees across 4 weeks |
| `src/components/admin/finance/PayoutsSection.tsx` | Add $25 default rate fallback; add expandable detail row per employee |
| `src/components/admin/finance/PayslipsSection.tsx` | Add "Send" button to update payslip status; add "Generate from Payouts" shortcut |
| `src/components/admin/FinanceTab.tsx` | No changes needed |

