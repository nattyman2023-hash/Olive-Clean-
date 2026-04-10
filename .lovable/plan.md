

## Finance Role Priority, Week Picker & Verification Fixes

### Findings from Investigation

1. **Sidebar**: Working correctly on both desktop (persistent) and mobile (offcanvas hamburger). All 5 groups (Operations, Customers, Team, Management, Assets) present with all 16 sections accounted for — no pages lost.

2. **Finance auto-redirect**: SmartRedirect only works in PWA standalone mode (`display-mode: standalone`). Finance users logging in via browser won't auto-redirect. Need to also add redirect logic to the admin login flow so finance-only users go to `/finance`.

3. **Week picker**: PayoutsTab currently hardcodes `now` for week calculation. No date picker exists.

4. **TeamTab pay fields**: Already implemented — `pay_type`, `fixed_job_rate`, `worker_classification` fields are present and save correctly.

5. **FinanceDashboard**: Already has pay method, tips, classification columns, and CSV download.

---

### Changes Needed

#### 1. Finance Auto-Navigation (not just PWA)

**File: `src/components/SmartRedirect.tsx`**
- Remove the `isStandalone` gate so ALL authenticated users get redirected from `/` to their dashboard, not just PWA users.

**File: `src/pages/AdminLogin.tsx`** (check if login redirects finance users)
- After successful login, if user has finance role but NOT admin/staff, redirect to `/finance` instead of `/admin`.

#### 2. Week Picker on Payouts Tab

**File: `src/pages/FinanceDashboard.tsx`**
- Add a `selectedWeekStart` state (default: current week Monday)
- Add left/right arrow buttons and a date picker popover to navigate weeks
- Replace hardcoded `now` with `selectedWeekStart` for all queries
- Re-fetch payouts when week changes

#### 3. No Other Changes Needed

- Sidebar verified — all pages present and functioning
- TeamTab pay fields verified — already working
- FinanceDashboard columns verified — pay method, tips, classification, CSV all present

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/SmartRedirect.tsx` | Remove standalone-only gate for redirects |
| `src/pages/AdminLogin.tsx` | Add finance role redirect after login |
| `src/pages/FinanceDashboard.tsx` | Add week picker to PayoutsTab |

