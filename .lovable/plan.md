

## Enhanced RBAC: View/Edit Granularity

### What Already Works
- `role_permissions` table with RLS exists and gates sidebar visibility
- `usePermissions` hook fetches permissions and provides `canAccess(section)`
- Sidebar hides sections users can't access; `AdminGate` blocks unauthorized content
- Since the admin dashboard is state-driven (not URL-routed), there's no `/admin/finance` URL to guard — the `canAccess` check in `renderSection` already prevents access

### What's Missing
The current system is binary (access or no access). The user wants **View vs Edit** granularity — e.g., a Finance Officer can *view* Analytics but not *edit* team records.

### Changes

#### 1. Database Migration
Add `can_edit` boolean to `role_permissions`:
```sql
ALTER TABLE role_permissions ADD COLUMN can_edit boolean NOT NULL DEFAULT false;
```
Existing rows get `can_edit = false` (view-only by default). Update seeded admin rows to `can_edit = true`.

#### 2. Update `usePermissions` Hook
- Return `canEdit(section): boolean` in addition to `canAccess(section)`
- Admin always returns `true` for both
- Non-admin: `canAccess` = row exists, `canEdit` = row exists AND `can_edit = true`

#### 3. Update `PermissionsManager` UI
- Change from single checkbox per cell to **two checkboxes**: View and Edit
- View unchecked = section hidden entirely
- View checked + Edit unchecked = read-only access
- Edit auto-checks View (can't edit without viewing)

#### 4. Pass `canEdit` to Tab Components
- Export `canEdit` from `usePermissions`
- Pass it down to components that have create/update/delete actions
- Components disable mutation buttons when `canEdit` returns false (e.g., hide "Add Client" button, disable form submissions)
- This is a progressive enhancement — start with Finance, Team, and Jobs tabs as the most critical

### Files

| File | Action |
|------|--------|
| Migration SQL | Add `can_edit` column to `role_permissions` |
| `src/hooks/usePermissions.ts` | Add `canEdit` helper |
| `src/components/admin/PermissionsManager.tsx` | Dual View/Edit checkboxes |
| `src/pages/AdminDashboard.tsx` | Pass `canEdit` to rendered sections |

