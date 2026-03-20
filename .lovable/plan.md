

# Fix: Endless Loading on Admin Login / Dashboard

## Root Cause

The `AuthProvider` in `src/hooks/useAuth.tsx` blocks the entire app with `loading: true` until two RPC calls (`has_role` for admin and client) complete. If these RPC calls are slow or hang (e.g. due to network latency, cold-start on the database, or RLS evaluation overhead), **every page** — including the simple `/admin/login` form — stays stuck because the auth context never resolves.

Additionally, there is a race condition: both `onAuthStateChange` and `getSession` fire on mount, potentially calling `checkRoles` twice simultaneously.

## Fix (single file: `src/hooks/useAuth.tsx`)

1. **Add a timeout to `checkRoles`** — wrap the RPC calls in a `Promise.race` with a 5-second timeout so the app always becomes interactive, even if role checks are slow. If the timeout fires, default to non-admin/non-client (safe fallback).

2. **Deduplicate initialization** — set up `onAuthStateChange` first (as recommended), then call `getSession`. Use a flag to prevent `checkRoles` from running twice for the same session.

3. **Don't block non-auth pages** — ensure `setLoading(false)` is called promptly even if `checkRoles` fails, so the login form renders immediately.

### Code Changes

```typescript
// In checkRoles, wrap with timeout:
const checkRoles = async (userId: string) => {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000)
    );
    const roleCheck = Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "client" as never }),
    ]);
    const [adminRes, clientRes] = await Promise.race([roleCheck, timeout]) as any;
    setIsAdmin(!!adminRes.data);
    setIsClient(!!clientRes.data);
  } catch {
    // Timeout or error — safe defaults
    setIsAdmin(false);
    setIsClient(false);
  }
};
```

```typescript
// In useEffect, use an initialized flag to prevent double checkRoles:
useEffect(() => {
  let initialized = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkRoles(session.user.id);
      } else {
        setIsAdmin(false);
        setIsClient(false);
      }
      initialized = true;
      setLoading(false);
    }
  );

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!initialized) {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

## Summary

- **1 file edited**: `src/hooks/useAuth.tsx`
- **No database changes needed**
- Adds timeout protection and deduplication to prevent infinite loading

