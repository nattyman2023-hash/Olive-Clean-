

## Fix Role Assignment, Add "Preview as Role", and Populate Demo Data

### Problem Analysis

1. **"Failed to add role" error**: Employees like Daniela Cruz and Maria Santos have fake `user_id` values that don't exist in `auth.users`. The `user_roles` table has a foreign key constraint (`user_roles_user_id_fkey`) referencing `auth.users(id)`, so inserts fail for these employees. The fix: show a better error message for employees without real auth accounts, and only allow role assignment for employees with valid auth accounts.

2. **"Preview as Finance" feature**: The impersonation system already exists but is tied to specific users. Add a simpler "Preview as Role" button in the Permissions tab that lets admin temporarily view the dashboard as if they had a specific role's permissions — without needing to pick a user.

3. **Demo data for Finance**: Populate `job_time_logs` with realistic clock-in/clock-out entries for employees with real auth accounts (Aisha, Siye, Tyler, Yonas) across the current and past weeks, so the Finance Dashboard payroll calculations have data to display.

### Changes

#### 1. Fix Role Assignment Error (TeamTab.tsx)
- In `RoleAssignmentCard`, check if the employee's `user_id` exists in `auth.users` (use a query to `profiles` table as proxy — all real auth users have a profile via the trigger)
- If no auth account exists, show a disabled state with message "This employee has no login account — roles can only be assigned to users with accounts"
- Improve error toast to show the actual error message

#### 2. Add "Preview as Role" Feature
**File: `src/components/admin/PermissionsManager.tsx`**
- Add an `Eye` icon button next to each role in the permissions matrix header
- Clicking it triggers impersonation with a synthetic preview that overrides `usePermissions` to use that role's configured permissions
- Simpler approach: use existing `startImpersonation` from `useAuth` + update `usePermissions` to respect impersonation by fetching permissions for the impersonated role instead of the real user

**File: `src/hooks/usePermissions.ts`**
- When `impersonatedRole` is set, fetch permissions for that role from `role_permissions` instead of the user's actual roles

**File: `src/pages/AdminDashboard.tsx`**
- When impersonating, hide the Admin badge and show the impersonation bar
- Import and render `ImpersonationBar`

#### 3. Populate Demo Data (Database Insert)
Insert job_time_logs for employees with real auth accounts:
- ~20-30 clock-in/clock-out pairs across current and past 2 weeks
- Varying hours (6-9 hour days) for realistic payroll data
- Also ensure some jobs exist for these employees in the current period

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/TeamTab.tsx` | Fix RoleAssignmentCard to handle missing auth accounts gracefully |
| `src/components/admin/PermissionsManager.tsx` | Add "Preview as Role" button per role |
| `src/hooks/usePermissions.ts` | Respect impersonated role for permission lookups |
| `src/pages/AdminDashboard.tsx` | Add ImpersonationBar, handle role preview mode |
| Database insert | Populate `job_time_logs` with demo clock-in/out data |

