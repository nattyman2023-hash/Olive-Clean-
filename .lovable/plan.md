

# Admin Impersonation, Bulk Job Management, Document View, and Loyalty Enhancements

## 1. "View As" Admin Impersonation

**Approach**: Store an `impersonatingUserId` in React context (not actual auth session swap, which would be insecure). The admin stays logged in as admin, but the app renders the target user's portal with their data.

### Changes
- **`src/hooks/useAuth.tsx`**: Add `impersonateUserId`, `impersonatedRole`, `startImpersonation(userId, role)`, `stopImpersonation()` to AuthContext. When impersonating, override `user.id` for data queries but keep actual admin session.
- **New: `src/components/admin/ImpersonationBar.tsx`**: Bright yellow sticky bar at top: "You are viewing as [Name]. Exit". Calls `stopImpersonation()` on click.
- **`src/components/admin/ClientsTab.tsx`**: Add "View Portal" button next to each client. On click, calls `startImpersonation(client_user_id, 'client')` and navigates to `/client`.
- **`src/components/admin/TeamTab.tsx`**: Add "View Portal" button next to each employee. Navigates to `/employee`.
- **`src/pages/ClientDashboard.tsx`**: When impersonating, skip auth redirect and use impersonated user ID for queries. Show `ImpersonationBar`.
- **`src/pages/EmployeeDashboard.tsx`**: Same pattern. Show `ImpersonationBar`.
- **`src/App.tsx`**: Render `ImpersonationBar` globally when active.

### Security
- No actual session swap. Admin queries data using the impersonated user's ID but the RLS still runs against the admin's actual session. For client/employee data that uses `auth.uid()` in RLS, we'll use admin's existing permissions (admin already has SELECT access to all tables).

---

## 2. Bulk Job Management

### Changes
- **`src/components/admin/JobsTab.tsx`**:
  - Add `selectedJobs: Set<string>` state
  - "Select All" checkbox in list header
  - Individual checkboxes on each job row
  - When `selectedJobs.size > 0`, show a fixed bottom toolbar with:
    - Count badge: "X selected"
    - "Delete" button (opens AlertDialog confirmation: "Delete X jobs? This will also remove associated history.")
    - "Change Status" dropdown for bulk status update
  - Delete mutation: deletes from `jobs` table by IDs
  - **Migration**: Add DELETE policy on `jobs` for admin role

---

## 3. Visual Document View with Edit Mode

### Changes
- **`src/components/admin/finance/InvoicePreview.tsx`**:
  - Add `editMode` toggle button
  - When in edit mode, render line item descriptions, quantities, rates as `<Input>` fields
  - Auto-recalculate subtotal, tax, total on field change
  - "Save" button that updates the invoice/estimate in the database
  - Add logo (`oliveLogo`) to the preview header for professional appearance
  - Add "From: Olive Clean" business details section

- **`src/components/admin/finance/PayslipsSection.tsx`**: Add a similar preview component for payslips with edit mode toggle.

---

## 4. Loyalty & Referral Enhancements

### Admin Side
- **`src/components/admin/PerksTab.tsx`**: In the member detail view, add a "Loyalty Management" section:
  - Manual point override: input field to add/subtract cleanings_completed
  - View referral tree: show who referred whom
  - Button to manually trigger milestone rewards

### Client Side
- **`src/components/client/LoyaltyStatus.tsx`**:
  - Change progress text to: "You are X cleanings away from a FREE Clean!"
  - When at 10+, show "Redeem Reward" button with choice: "Free Cleaning" or "Complimentary Dusting"
  - Add WhatsApp share button: "Share my link via WhatsApp" that opens `wa.me` with pre-filled referral message
  - Show referral incentive text: "Give 10%, Get 5 Points"

---

## Database Migration
- Add DELETE policy on `jobs` for admin role

---

## Implementation Order
1. Migration (admin delete on jobs)
2. Impersonation system (context + bar + buttons in ClientsTab/TeamTab)
3. Bulk job management (JobsTab selection + toolbar)
4. Invoice/payslip edit mode (InvoicePreview upgrades)
5. Loyalty enhancements (admin point management + client WhatsApp share + reward choice)

## Files Modified/Created
| File | Action |
|---|---|
| Migration SQL | Admin DELETE on jobs |
| `src/hooks/useAuth.tsx` | Add impersonation state/methods |
| `src/components/admin/ImpersonationBar.tsx` | New: yellow exit bar |
| `src/components/admin/ClientsTab.tsx` | Add "View Portal" button |
| `src/components/admin/TeamTab.tsx` | Add "View Portal" button |
| `src/pages/ClientDashboard.tsx` | Support impersonation mode |
| `src/pages/EmployeeDashboard.tsx` | Support impersonation mode |
| `src/App.tsx` | Render ImpersonationBar globally |
| `src/components/admin/JobsTab.tsx` | Bulk select + delete + status change |
| `src/components/admin/finance/InvoicePreview.tsx` | Edit mode + logo + business details |
| `src/components/admin/PerksTab.tsx` | Manual point management + referral tree |
| `src/components/client/LoyaltyStatus.tsx` | WhatsApp share + reward choice + better messaging |

