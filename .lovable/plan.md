

## Add More Assignable Roles (Admin Assistant, etc.)

### Current State
- The `app_role` enum has: `admin`, `staff`, `client`, `finance`
- The `RoleAssignmentCard` in TeamTab only shows `staff` and `finance` as assignable
- The `PermissionsManager` only configures permissions for `staff` and `finance`

### Changes

#### 1. Database Migration
Add new enum value to `app_role`:
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_assistant';
```

#### 2. Update `PermissionsManager.tsx`
- Add `"admin_assistant"` to `CONFIGURABLE_ROLES`
- Update the matrix state initializer to include the new role
- The permission matrix table will automatically show columns for the new role

#### 3. Update `RoleAssignmentCard` in `TeamTab.tsx`
- Add `admin_assistant` to `ASSIGNABLE_ROLES` array with label "Admin Assistant" and description "Limited admin access based on configured permissions"

#### 4. Update `useAuth.tsx`
- Add `isAdminAssistant` state and resolve it via `has_role` RPC on login
- Expose it from context (optional — permissions are already driven by `role_permissions` table, so the `usePermissions` hook handles access regardless)

#### 5. Update `usePermissions.ts`
- No changes needed — it already reads from `role_permissions` for non-admin users based on their actual roles

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `admin_assistant` to `app_role` enum |
| `src/components/admin/PermissionsManager.tsx` | Add `admin_assistant` to configurable roles |
| `src/components/admin/TeamTab.tsx` | Add `admin_assistant` to assignable roles in `RoleAssignmentCard` |

