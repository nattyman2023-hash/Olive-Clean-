
Issue confirmed.

Do I know what the issue is? Yes.

What I found:
- The password login request is succeeding. The network log shows `POST /auth/v1/token?grant_type=password` returning `200`, so this is not a bad-credentials problem.
- The login spinner staying stuck matches a documented Supabase client deadlock: `src/hooks/useAuth.tsx` still does an async Supabase call inside `onAuthStateChange`:
  - the callback is `async`
  - it awaits `checkRoles(...)`
  - `checkRoles(...)` calls `supabase.rpc("has_role", ...)`
- Supabase’s docs explicitly warn that calling other Supabase methods inside `onAuthStateChange` can cause the next auth call to hang. That is the exact pattern still present here.
- There is also a secondary guard issue in `src/pages/EmployeeDashboard.tsx`: it redirects based on `isStaff` before role loading is finished, which can bounce a valid employee back to login.

Plan to fix:

1. Rewrite `src/hooks/useAuth.tsx` so `onAuthStateChange` is synchronous only
- Remove all `await` logic from the auth callback
- Do not call `supabase.rpc`, `getSession`, `getUser`, or functions inside that callback
- Let the callback only:
  - set `session`
  - set `user`
  - clear roles on sign-out / no session
  - mark auth initialization complete

2. Move role resolution into a separate effect outside the auth callback
- Add a second `useEffect` that watches `user?.id`
- If no user:
  - clear `isAdmin/isStaff/isClient`
  - set `rolesLoading = false`
- If same resolved user:
  - skip role fetch
- If new user:
  - set `rolesLoading = true`
  - call `has_role` RPCs there
  - cache the resolved user id
- This keeps the auth callback safe while preserving role caching

3. Keep login pages simple
- `AdminLogin.tsx`, `ClientLogin.tsx`, `EmployeeLogin.tsx` should continue to:
  - call `signInWithPassword`
  - navigate immediately on success
- No role RPCs on the login pages
- Use `navigate(..., { replace: true })` to reduce back-button loopiness

4. Harden dashboard guards so they wait for roles
- `AdminDashboard.tsx`: mostly already correct; keep waiting for `rolesLoading`
- `ClientDashboard.tsx`:
  - include `rolesLoading` in the loading gate
  - only run client queries after roles are resolved and `isClient` is true
- `EmployeeDashboard.tsx`:
  - add `rolesLoading` from `useAuth`
  - do not redirect while roles are still loading
  - only query employee data when `!rolesLoading && isStaff`

5. Small cleanup to prevent future auth edge cases
- Keep `resolvedUserIdRef`
- Skip role fetches on token refresh by virtue of the separate role effect
- Ensure failed role checks still end `rolesLoading` so the UI never stays blocked forever

Files to update:
- `src/hooks/useAuth.tsx`
- `src/pages/AdminLogin.tsx`
- `src/pages/ClientLogin.tsx`
- `src/pages/EmployeeLogin.tsx`
- `src/pages/ClientDashboard.tsx`
- `src/pages/EmployeeDashboard.tsx`

Expected result after this fix:
- Admin login should stop hanging on the spinner
- Successful logins should navigate immediately
- Dashboard access should resolve cleanly after roles load
- Employee login should no longer bounce back to `/employee/login` during role resolution

Verification checklist:
- Log in through `/admin/login` with a valid admin account
- Log in through `/client/login` with a valid client account
- Log in through `/employee/login` with a valid staff account
- Refresh each dashboard while signed in
- Try the “wrong portal” case and confirm it redirects cleanly instead of hanging
