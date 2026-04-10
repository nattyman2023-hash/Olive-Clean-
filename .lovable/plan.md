

## Enhanced RBAC: Read-Only Forms, Remaining Tabs, and Role Assignment UI

### Overview
Three workstreams: (1) disable form inputs in TeamTab's employee profile when read-only, (2) wire `readOnly` to BookingsTab, ClientsTab, SuppliesTab, HiringTab, and remaining tabs, (3) add a Role Assignment section so admins can assign roles (staff, finance, etc.) to users.

---

### 1. Employee Profile Detail — Disabled Inputs in Read-Only Mode

**File: `src/components/admin/TeamTab.tsx`**

When `readOnly` is true, all form fields in the profile detail view become disabled:
- All `<Input>` fields get `disabled={readOnly}`
- All `<Select>` components get `disabled={readOnly}`
- `<Textarea>` gets `disabled={readOnly}`
- Onboarding checklist checkboxes get `disabled={readOnly}`
- Certification add/remove buttons hidden when `readOnly`
- Photo upload button hidden when `readOnly`

### 2. Wire `readOnly` to Remaining Tabs

Each tab accepts `readOnly?: boolean` and hides mutation buttons when true.

**`src/components/admin/BookingsTab.tsx`**
- Accept `readOnly` prop
- Hide status change buttons ("Confirm", "Complete", "Cancel") and "Invite to Portal" button when `readOnly`

**`src/components/admin/ClientsTab.tsx`**
- Accept `readOnly` prop
- Hide "Add Client" button, "Delete" action, "Send Invite", "Set Password" when `readOnly`
- Disable form fields in detail view when `readOnly`

**`src/components/admin/SuppliesTab.tsx`**
- Accept `readOnly` prop
- Hide "Add Item", "Log Usage", "Restock" buttons and supply request approval actions when `readOnly`

**`src/components/admin/HiringTab.tsx`**
- Accept `readOnly` prop
- Hide "Add Posting" button, status change actions, "Hire" button, notes editing when `readOnly`

**`src/pages/AdminDashboard.tsx`**
- Update `renderSection` to pass `readOnly` to BookingsTab, ClientsTab, SuppliesTab, HiringTab

### 3. Role Assignment UI for Admins

**File: `src/components/admin/TeamTab.tsx`** (within employee profile detail)

Add a "Roles" section in the employee profile card (admin-only, never shown when `readOnly`):
- Fetch current roles from `user_roles` for that employee's `user_id`
- Show checkboxes for assignable roles: `staff`, `finance`
- Admin can toggle roles on/off — inserts or deletes from `user_roles`
- This lets admins promote a staff member to also have the `finance` role

No new RLS changes needed — `user_roles` already has admin-only write access via the existing `has_role` check pattern.

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/TeamTab.tsx` | Disable all form fields when `readOnly`; add role assignment checkboxes |
| `src/components/admin/BookingsTab.tsx` | Accept `readOnly`, hide mutation buttons |
| `src/components/admin/ClientsTab.tsx` | Accept `readOnly`, hide mutation buttons, disable forms |
| `src/components/admin/SuppliesTab.tsx` | Accept `readOnly`, hide mutation buttons |
| `src/components/admin/HiringTab.tsx` | Accept `readOnly`, hide mutation buttons |
| `src/pages/AdminDashboard.tsx` | Pass `readOnly` to all remaining tabs |

