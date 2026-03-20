

# Fix: Admin Tabs Disappearing When Switching Tabs

## Root Cause

When Supabase fires `onAuthStateChange` (e.g., during token refresh or tab interaction), the `checkRoles` function is called again. During that async call, if it times out or errors, `isAdmin` is set to `false` — causing Perks, Analytics, and Team tabs to vanish mid-session.

Additionally, the race between `onAuthStateChange` and `getSession` can trigger `checkRoles` twice, and the second call may reset roles before resolving.

## Fix (`src/hooks/useAuth.tsx`)

1. **Preserve existing roles during re-checks** — only update `isAdmin`/`isClient` on successful RPC responses, never reset to `false` on timeout/error if user is still logged in
2. **Skip redundant role checks** — if roles are already loaded for the same user, don't re-check on every auth state change (only on `SIGNED_IN` and `TOKEN_REFRESHED` events that change the user)
3. **Use `setTimeout` with `setLoading(false)` as a failsafe** so the app never hangs

### Key Changes

```typescript
const checkRoles = async (userId: string) => {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000)
    );
    const roleCheck = Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "client" as never }),
    ]);
    const [adminRes, clientRes] = (await Promise.race([roleCheck, timeout])) as any;
    setIsAdmin(!!adminRes.data);
    setIsClient(!!clientRes.data);
  } catch {
    // On timeout/error, DON'T reset roles — keep whatever was previously set
    // Only reset on explicit sign-out (handled separately)
  }
};
```

In `onAuthStateChange`:
```typescript
async (_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  if (session?.user) {
    // Only re-check roles on sign-in, not every event
    if (_event === 'SIGNED_IN' || !initialized) {
      await checkRoles(session.user.id);
    }
  } else {
    // Only reset on actual sign-out
    setIsAdmin(false);
    setIsClient(false);
  }
  initialized = true;
  setLoading(false);
}
```

## Summary
- **1 file changed**: `src/hooks/useAuth.tsx`
- Roles persist across tab switches and token refreshes
- Roles only reset on explicit sign-out

