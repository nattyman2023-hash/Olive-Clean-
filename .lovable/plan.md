

## Read-Only Badge & canEdit Wiring

### Overview
Add a visual "Read-only" banner when users have View but not Edit access, and wire up `canEdit` to Finance, Team, and Jobs tabs to hide/disable mutation buttons.

### Changes

#### 1. Read-Only Banner Component
**File: `src/components/admin/ReadOnlyBanner.tsx`** (new)
- Simple component: shows a banner with Lock icon + "Read-only — you have view access to this section" when `readOnly` is true
- Returns `null` when `readOnly` is false

#### 2. Update `renderSection` in AdminDashboard
**File: `src/pages/AdminDashboard.tsx`**
- Wrap rendered sections with `<ReadOnlyBanner readOnly={!editable} />` above each tab
- Pass `readOnly={!editable}` prop to `JobsTab`, `TeamTab`, and `FinanceTab`

#### 3. Wire up JobsTab
**File: `src/components/admin/JobsTab.tsx`**
- Accept `readOnly?: boolean` prop
- When `readOnly`: hide "Add Job" button, hide bulk delete button, disable status change dropdowns, hide delete actions in detail panel

#### 4. Wire up TeamTab
**File: `src/components/admin/TeamTab.tsx`**
- Accept `readOnly?: boolean` prop
- When `readOnly`: hide "Add Employee" button, hide "Invite" button, disable save/update in employee detail form, hide delete actions

#### 5. Wire up FinanceTab
**File: `src/components/admin/FinanceTab.tsx`**
- Accept `readOnly?: boolean` prop and pass it down to `InvoicesSection`, `EstimatesSection`, `PayslipsSection`, `ExpensesSection`
- Each sub-section hides "Create" / "Add" / "Delete" buttons when `readOnly`

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/ReadOnlyBanner.tsx` | **Create** — lock icon + "Read-only" text banner |
| `src/pages/AdminDashboard.tsx` | Show banner + pass `readOnly` prop to tabs |
| `src/components/admin/JobsTab.tsx` | Accept `readOnly`, hide mutation buttons |
| `src/components/admin/TeamTab.tsx` | Accept `readOnly`, hide mutation buttons |
| `src/components/admin/FinanceTab.tsx` | Accept `readOnly`, pass down to sub-sections |
| `src/components/admin/finance/InvoicesSection.tsx` | Accept `readOnly`, hide create/delete |
| `src/components/admin/finance/EstimatesSection.tsx` | Accept `readOnly`, hide create/delete |
| `src/components/admin/finance/PayslipsSection.tsx` | Accept `readOnly`, hide create/delete |
| `src/components/admin/finance/ExpensesSection.tsx` | Accept `readOnly`, hide create/delete |

