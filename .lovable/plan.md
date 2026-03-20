

# Fix Admin Nav + Employee Portal

## Problems Identified

1. **Admin tabs shrinking**: The tabs for Perks, Analytics, Team, Hiring, Routes are gated behind `isAdmin`. The `checkRoles` function has a 5-second timeout and on failure silently preserves state (defaults to `false`). Race conditions or slow RPC calls cause `isAdmin` to remain `false`, hiding most tabs.

2. **No employee portal**: Employees (hired via ATS) have no login page or dedicated dashboard.

## Changes

### 1. Fix Admin Tab Visibility

**`src/pages/AdminDashboard.tsx`**
- Make the TabsList horizontally scrollable on smaller screens using `overflow-x-auto` and `flex-wrap` or a scroll container
- Show all 8 tabs always (remove `isAdmin` gating on tab triggers) but keep content gated — if a non-admin clicks a restricted tab, show "Admin access required"
- Alternative (better UX): Keep `isAdmin` gating but add a loading skeleton for tabs while roles are being resolved

**`src/hooks/useAuth.tsx`**
- Add `isStaff` role check alongside `isAdmin` and `isClient`
- Improve the `checkRoles` timeout handling — retry once on failure instead of silently failing

### 2. Employee Login Page

**`src/pages/EmployeeLogin.tsx`** (new)
- Login form similar to `ClientLogin.tsx`
- Authenticates via email/password
- Redirects to `/employee` dashboard on success
- Checks for `staff` role

### 3. Employee Dashboard

**`src/pages/EmployeeDashboard.tsx`** (new)
- Header with employee name and sign-out
- **Today's Schedule**: List of assigned jobs for today with client name, address, time, service type
- **My Performance**: Monthly stats from `employee_performance` table (jobs completed, avg rating, efficiency)
- **Profile**: View own employee record (certifications, onboarding checklist status)

### 4. Route Updates

**`src/App.tsx`**
- Add `/employee/login` → `EmployeeLogin`
- Add `/employee` → `EmployeeDashboard`

### 5. Employee Invite Flow

**`src/components/admin/TeamTab.tsx`**
- Add "Send Login Email" button for employees without auth accounts
- Reuse the invite pattern from `invite-client` but assign `staff` role instead

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Add `isStaff`, improve role check reliability |
| `src/pages/AdminDashboard.tsx` | Fix tab overflow, improve tab visibility |
| `src/pages/EmployeeLogin.tsx` | New employee login page |
| `src/pages/EmployeeDashboard.tsx` | New employee dashboard |
| `src/App.tsx` | Add employee routes |
| `src/components/admin/TeamTab.tsx` | Add invite button for employees |

