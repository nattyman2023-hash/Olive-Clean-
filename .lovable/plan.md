

## Add "Cleaner" Role & Custom Role Creation

### Overview
Add `cleaner` to the `app_role` enum, and introduce a system where admins can create entirely new roles beyond the hardcoded ones. Since Postgres enums can't be extended at runtime by app users, the approach is to replace the enum-based `role` column in `role_permissions` and `user_roles` with a plain `text` column, and add a `custom_roles` table to store admin-defined roles.

### Changes

#### 1. Database Migration
- Add `cleaner` to `app_role` enum: `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cleaner';`
- Create a `custom_roles` table for admin-defined roles:
  ```sql
  CREATE TABLE public.custom_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
  -- Admin-only write, all authenticated can read
  ```
- Seed it with the built-in roles so they appear in the UI: staff, finance, admin_assistant, cleaner

#### 2. Update `PermissionsManager.tsx`
- Instead of hardcoded `CONFIGURABLE_ROLES`, fetch roles from `custom_roles` table
- Dynamically render columns for each role in the permission matrix
- Add a "Create Role" button with a dialog (name + description) that inserts into `custom_roles`
- Add ability to delete custom roles (with confirmation)

#### 3. Update `RoleAssignmentCard` in `TeamTab.tsx`
- Fetch available roles from `custom_roles` instead of hardcoded `ASSIGNABLE_ROLES`
- Render checkboxes dynamically for all roles
- Role toggle logic stays the same (insert/delete from `user_roles`)

#### 4. Update `useAuth.tsx`
- Add `isCleaner` state resolved via `has_role` RPC (for any built-in gating)

#### 5. Adjust `role_permissions` and `user_roles` columns
- Since `user_roles.role` and `role_permissions.role` use the `app_role` enum, new custom roles can't be stored there without altering the enum each time. Two options:
  - **Option A**: Keep enum, add new values via migration each time (not dynamic)
  - **Option B**: Change columns to `text` type for full flexibility

Given the user wants dynamic role creation, **Option B** is the right path. The migration will:
- Alter `user_roles.role` from `app_role` to `text`
- Alter `role_permissions.role` from `app_role` to `text`
- Keep the `has_role` function working by updating it to compare text
- The `app_role` enum can remain for backward compatibility but won't constrain the columns

### Technical Detail: Enum to Text Migration
```sql
-- Convert columns to text
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE text USING role::text;

-- Update has_role function to accept text
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `cleaner` to enum, create `custom_roles` table, convert role columns to text, update `has_role` function |
| `src/components/admin/PermissionsManager.tsx` | Fetch roles from `custom_roles`, add Create/Delete role UI |
| `src/components/admin/TeamTab.tsx` | Fetch roles from `custom_roles` for dynamic assignment |
| `src/hooks/useAuth.tsx` | Add `isCleaner` check |
| `src/pages/AdminDashboard.tsx` | Allow cleaners to access dashboard if they have permissions |

