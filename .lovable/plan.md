

## End-to-End Audit Results: Team Invitation and Role System

### Audit Findings

#### 1. Email Invitation Logic — PASS with issues
- The `invite-employee` edge function correctly creates auth users via `inviteUserByEmail` with `redirectTo: https://oliveclean.co/reset-password`
- The invite link validity is controlled by Supabase (default 24h) — working correctly
- **Issue found**: The `invite-employee` function always assigns the `staff` role (line 108-112), but the TeamTab also assigns the role selected in the dropdown (line 329-331). This means every invited employee gets `staff` PLUS whatever role was selected. A Finance person shouldn't necessarily have `staff` role — it gives them access to sections meant for cleaning technicians.

#### 2. Onboarding Flow — PASS
- ResetPassword page correctly listens for `PASSWORD_RECOVERY` event, shows password form, and calls `updateUser({ password })`
- After password set, user is redirected to `/admin` or `/client` based on role check

#### 3. Smart Redirection — PARTIAL PASS, issues found
- **SmartRedirect** only runs on `/` route. After password reset, `ResetPassword.tsx` redirects to `/admin` or `/client` (line 96) — it doesn't check for `finance`, `staff`, or `cleaning_technician` roles
- **Issue**: A Finance user setting their password gets redirected to `/admin` (because `isClient` is false), but SmartRedirect only triggers on `/`. Since they land on `/admin`, the AdminDashboard access check (line 96) should allow them IF they have `finance` permissions in `role_permissions`. However, the guard on line 110 checks `!isAdmin && !isStaff && !isAdminAssistant` — **Finance role is not in this check**, so a pure Finance user (no staff role) gets kicked to `/`
- **Issue**: `isCleaningTechnician` is checked in the AdminDashboard gate but `isFinance` is not. A user with only the `finance` role and permissions will be blocked from `/admin`

#### 4. Permission Lockdown — PASS
- The AdminDashboard uses `canAccess(section)` from `usePermissions` to gate each section
- The sidebar filters items via `canAccess(item.value)`, hiding inaccessible sections
- URL-based bypass is prevented because the dashboard is a single-page app with section switching (not separate routes) — typing `/admin/hiring` just loads `/admin` and defaults to "bookings"

#### 5. Visual Verification — PASS
- Role badges with `ROLE_BADGE_COLORS` mapping are implemented in TeamTab
- "Cleaning Technician" rename is applied across the codebase

---

### Issues Requiring Fixes

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `invite-employee` always assigns `staff` role to every invited employee | Medium | Only assign `staff` if no other role is selected, OR skip auto-assigning `staff` and let the TeamTab handle role assignment |
| 2 | `ResetPassword.tsx` only redirects to `/admin` or `/client` — doesn't handle Finance or Staff roles properly | High | Add role checks for finance → `/finance`, staff → `/employee` |
| 3 | `AdminDashboard` gate (line 96, 110) doesn't include `isFinance`, so pure Finance users are kicked out | High | Add `isFinance` to the access checks in AdminDashboard |

### Plan

#### File: `supabase/functions/invite-employee/index.ts`
- Make the auto-assigned `staff` role conditional: only add it if no specific role will be assigned by the caller. Add an optional `role` parameter to the function body. If provided and not `staff`, skip the automatic `staff` insertion and instead insert the provided role.

#### File: `src/pages/ResetPassword.tsx`
- After password update (line 92-96), add role checks for `finance` and `staff`:
  - Finance → `/finance`
  - Staff → `/employee`
  - Client → `/client`
  - Default → `/admin`

#### File: `src/pages/AdminDashboard.tsx`
- Line 96: Add `isFinance` to the role check so Finance users aren't kicked out
- Line 110: Add `isFinance` to the render guard
- Import and use `isFinance` from `useAuth()`

#### File: `src/components/admin/TeamTab.tsx`
- Pass the selected `formRole` to the `invite-employee` function call so the edge function knows which role to assign instead of defaulting to `staff`

### Files Summary

| File | Action |
|------|--------|
| `supabase/functions/invite-employee/index.ts` | Accept optional `role` param, conditionally assign staff |
| `src/pages/ResetPassword.tsx` | Add finance/staff role-based redirect after password set |
| `src/pages/AdminDashboard.tsx` | Add `isFinance` to access guards |
| `src/components/admin/TeamTab.tsx` | Pass `formRole` to invite-employee function |

