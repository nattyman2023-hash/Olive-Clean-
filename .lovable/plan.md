

# Fix Login Lag and Access Issues

## Root Cause

Two problems creating the "lag" and inaccessibility:

1. **Race condition in `useAuth.tsx`**: Both `onAuthStateChange` and `getSession()` can call `checkRoles` simultaneously because the `initialized` flag is set after an `await`, leaving a window where both paths execute. This causes double RPC calls and unpredictable `rolesLoading` toggling.

2. **Redundant RPC calls on login pages**: After `signInWithPassword`, the login page calls `has_role` 3 times AND `onAuthStateChange` fires `SIGNED_IN` which calls `checkRoles` (another 3 RPCs). That's 6 concurrent RPC calls competing with each other while the user stares at a spinner.

## Fix

### 1. Rewrite `src/hooks/useAuth.tsx` — Single entry point for auth

- Remove the separate `getSession()` call entirely
- Handle everything through `onAuthStateChange` which fires `INITIAL_SESSION` on mount (guaranteed by Supabase to fire before `getSession` resolves)
- Use `resolvedUserIdRef` to cache roles and skip redundant checks
- Never set `rolesLoading(true)` if roles are already resolved for the same user

```text
Flow:
  INITIAL_SESSION (has user) → checkRoles → set loading=false
  INITIAL_SESSION (no user) → set loading=false immediately
  SIGNED_IN (same user already resolved) → skip checkRoles
  SIGNED_IN (new user) → checkRoles
  TOKEN_REFRESHED → always skip
  SIGNED_OUT → clear everything
```

### 2. Simplify login page redirects — `AdminLogin.tsx`, `ClientLogin.tsx`, `EmployeeLogin.tsx`

- Remove all `has_role` RPC calls from login pages
- After `signInWithPassword` succeeds, simply navigate to the target dashboard
- Let the dashboard's role guard (already in place) handle the redirect if the role doesn't match
- This eliminates the 3 redundant RPC calls and makes login feel instant

For example, `ClientLogin.tsx` after login just does `navigate("/client")`. If the user is actually an admin, the `ClientDashboard` guard redirects them to `/`.

### 3. Add `INITIAL_SESSION` event handling

The current code only checks for `SIGNED_IN` — but Supabase v2 fires `INITIAL_SESSION` as the first event on page load. The code falls through to `!initialized` which works but is fragile. Explicitly handle `INITIAL_SESSION`.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Rewrite: remove `getSession()`, handle `INITIAL_SESSION`, cache roles properly |
| `src/pages/AdminLogin.tsx` | Remove `has_role` RPCs, navigate directly to `/admin` |
| `src/pages/ClientLogin.tsx` | Remove `redirectByRole`, navigate directly to `/client` |
| `src/pages/EmployeeLogin.tsx` | Remove `has_role` RPCs, navigate directly to `/employee` |

