

# Plan: Admin Set Custom Password for Customers & Employees

## Approach

Create a backend function that uses the Supabase Admin API (`updateUserById`) to set a password for any user. The admin dashboard will expose a "Set Password" action on both the Clients and Team tabs for users who have linked auth accounts.

## Changes

### 1. New Edge Function: `set-user-password`
**File:** `supabase/functions/set-user-password/index.ts`
- Accepts `{ user_id, password }` in the request body
- Validates the caller is an admin (same pattern as `invite-employee`)
- Uses `adminClient.auth.admin.updateUserById(user_id, { password })` to set the password
- Validates password length (minimum 6 characters)

### 2. Admin ClientsTab — Add "Set Password" button
**File:** `src/components/admin/ClientsTab.tsx`
- For clients with a `client_user_id` (linked auth account), show a key/lock icon button
- Opens a dialog with a password input field and confirm button
- Calls the `set-user-password` edge function with the client's `client_user_id`

### 3. Admin TeamTab — Add "Set Password" button
**File:** `src/components/admin/TeamTab.tsx`
- For employees with a `user_id`, show the same set-password dialog
- Calls the edge function with the employee's `user_id`

### 4. Shared Dialog Component
**File:** `src/components/admin/SetPasswordDialog.tsx`
- Reusable dialog: takes `userId`, `userName`, `open`, `onOpenChange`
- Password + confirm password fields with validation (min 6 chars, must match)
- Calls the edge function and shows success/error toast

No database changes needed.

