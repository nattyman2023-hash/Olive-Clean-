

## Custom Role-Based Access Control (RBAC) System

### Overview
Replace the current hardcoded `adminOnly` flags with a dynamic permission system. A Super Admin can create custom roles (e.g. "Admin Assistant", "Operations Lead") and assign which dashboard sections each role can access.

---

### 1. Database Changes (Migration)

**New table: `role_permissions`**
```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  section TEXT NOT NULL,  -- e.g. 'bookings', 'finance', 'analytics'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, section)
);
```

**Seed default permissions:**
- `admin` gets all 16 sections
- `staff` gets `bookings`, `jobs`, `clients`
- `finance` gets `finance`, `analytics`

**RLS:** Admin-only full access; authenticated users can SELECT their own role's permissions (via `has_role` check).

**Note:** The `app_role` enum stays as-is (`admin`, `staff`, `client`, `finance`). Adding new enum values requires a migration per new role. For true "custom" role names beyond the enum, we'd need a separate `custom_roles` table — but that's a much larger change that would also require rewriting RLS policies across every table. 

**Practical approach for now:** Use the existing enum roles but make their dashboard section access configurable via `role_permissions`. New roles can be added via migration when needed (e.g. `ALTER TYPE app_role ADD VALUE 'ops_lead'`).

---

### 2. New Hook: `usePermissions`

**File: `src/hooks/usePermissions.ts`**

- Fetches `role_permissions` for the current user's roles
- Returns `allowedSections: string[]` and a helper `canAccess(section: string): boolean`
- Caches per user ID to avoid refetching

---

### 3. Update Sidebar to Use Permissions

**File: `src/components/admin/AdminSidebar.tsx`**

- Replace `adminOnly` boolean with `canAccess(item.value)` from the permissions hook
- Items the user can't access are hidden (not locked)
- Admin always sees everything (bypass check)

---

### 4. Update AdminDashboard Rendering

**File: `src/pages/AdminDashboard.tsx`**

- Use `usePermissions` to gate section rendering instead of `isAdmin` checks
- If user navigates to a section they lack permission for, show the `AdminGate` component

---

### 5. Permissions Manager UI (Admin Only)

**File: `src/components/admin/PermissionsManager.tsx`**

- New component accessible from the sidebar under a "Settings" group (admin-only)
- Shows a matrix: roles as rows, sections as columns, with toggle checkboxes
- Admin can check/uncheck which sections each role can access
- Saves changes to `role_permissions` table

**Add to sidebar:** New "Settings" group with a single "Permissions" item (admin-only).

---

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `role_permissions` table with RLS; seed defaults |
| `src/hooks/usePermissions.ts` | **Create** — fetch and cache section permissions |
| `src/components/admin/AdminSidebar.tsx` | Replace `adminOnly` with dynamic permission checks |
| `src/pages/AdminDashboard.tsx` | Use `usePermissions` for section gating |
| `src/components/admin/PermissionsManager.tsx` | **Create** — role-section matrix editor |

