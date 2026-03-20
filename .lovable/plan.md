

# Plan: Branded Auth Emails + Admin Nav Fix + Employee Profile Builder

## 1. Branded Auth Email Templates

The email domain `notify.wubhairstudio.co.uk` is configured (pending DNS). I will:

- Scaffold auth email templates using the managed flow
- Apply Olive Clean branding to all 6 templates:
  - Primary button: `hsl(62, 24%, 41%)` (olive green)
  - Foreground: `hsl(0, 0%, 18%)`
  - Muted text: `hsl(0, 0%, 45%)`
  - Font: Poppins with Arial fallback
  - Border radius: `0.75rem`
  - White email background
  - Warm, professional tone matching the app's "calm luxury" voice
- Deploy `auth-email-hook` edge function

DNS verification is still pending — emails will start sending once DNS completes. You can monitor progress in Cloud settings.

## 2. Fix Admin Dashboard Tab Visibility

**Root cause**: Tabs 4-8 (Perks, Analytics, Team, Hiring, Routes) are gated behind `isAdmin`, which defaults to `false` and can remain `false` if the role check times out or races.

**Fix in `AdminDashboard.tsx`**:
- Add a `rolesLoading` state to `useAuth` that is `true` until `checkRoles` resolves
- While `rolesLoading` is true, show a skeleton placeholder for tabs
- Show all 8 tabs once roles resolve (keeping content gated if not admin)
- Ensure `ScrollArea` works correctly for horizontal scrolling on mobile

**Fix in `useAuth.tsx`**:
- Add `rolesLoading` boolean to context — starts `true`, set `false` after `checkRoles` completes or fails
- Increase retry attempts from 1 to 2

## 3. Employee Profile Builder in Admin Dashboard

Enhance `TeamTab.tsx` with an expanded employee profile view accessible from the admin:

- **Profile detail panel**: When clicking an employee row, show a full profile view with:
  - Personal info (name, email, phone, status)
  - Certifications management (add/remove individual certs)
  - Onboarding checklist with toggle controls
  - Performance history table
  - Notes/internal comments
  - "Send Login Invite" button prominently placed
- **Edit inline**: Allow editing employee fields directly in the profile view instead of a separate dialog
- This consolidates the current scattered checklist/performance/edit flows into one unified profile builder

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Add `rolesLoading` state |
| `src/pages/AdminDashboard.tsx` | Show skeleton while roles load, then all tabs |
| `src/components/admin/TeamTab.tsx` | Add unified employee profile builder view |
| `supabase/functions/_shared/email-templates/*` | 6 branded templates (scaffolded) |
| `supabase/functions/auth-email-hook/*` | Auth email hook (scaffolded + deployed) |

