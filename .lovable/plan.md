

## Fix "No Login Account", Portal Redirect, and Add Member Flow

### Problems Identified

1. **"No login account" message**: When adding an employee, `user_id` is set to a random UUID (`crypto.randomUUID()`). The `RoleAssignmentCard` checks if a `profiles` row exists for that UUID — it doesn't, since the real auth user gets a different UUID. After the invite succeeds and `invite-employee` updates `user_id`, the profile view still shows stale data.

2. **Portal redirect for non-technicians**: `SmartRedirect` correctly routes Finance → `/admin`, but if a Finance user somehow lands on `/employee`, the guard at line 93 kicks them to `/employee/login` because they lack the `staff` role. This is actually correct behavior — Finance users should never see the Employee portal. The real issue is ensuring they always land on `/admin`.

3. **Add Member flow**: The invite already fires automatically, but the initial `user_id` is a throwaway UUID. The flow should wait for the invite response and use the returned `user_id` to update the employee record immediately in the UI.

### Changes

#### File: `src/components/admin/TeamTab.tsx`

**Fix 1 — RoleAssignmentCard: Add "Invite to App" button when no account exists**
- When `hasAccount` is false, instead of just showing the message, also show an "Invite to App" button (if the employee has a valid email)
- The button calls `invite-employee`, and on success, invalidates the `profile_exists` query so the roles section activates immediately
- Pass the component the employee's email and ID so it can trigger the invite

**Fix 2 — Add Member flow: Use returned `user_id` from invite**
- In `handleAddSubmit`, after the invite succeeds, update the local employee record's `user_id` with the returned `data.user_id` (the edge function already does the DB update)
- Remove the initial `crypto.randomUUID()` for `user_id` — instead, if no email is provided (no invite), use a placeholder; if email is provided, the `user_id` will come from the invite response

**Fix 3 — Invite mutation in profile view: refresh account state after invite**
- In `inviteMutation.onSuccess`, also invalidate `["profile_exists", profileEmployee.user_id]` and `["all_user_roles"]`
- After invite, update `profileEmployee.user_id` with the returned auth user ID

#### File: `src/components/admin/TeamTab.tsx` — RoleAssignmentCard props
- Add `employeeEmail`, `employeeId`, and `employeeName` props so it can trigger the invite itself
- When no account exists, show: message + "Invite to App" button
- On successful invite, invalidate queries and activate roles section

#### File: `src/pages/EmployeeDashboard.tsx` — No changes needed
- The guard correctly restricts to `staff` role users. Finance/Admin users should not access this portal — they use `/admin` or `/finance`. The `SmartRedirect` handles routing correctly.

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/TeamTab.tsx` | Add "Invite to App" button in RoleAssignmentCard; fix user_id flow in add/invite mutations; refresh account state after invite |

