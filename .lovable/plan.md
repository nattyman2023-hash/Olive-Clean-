

# Plan: Fix Employee Invite, Login, Route Status Filter, and Map Issues

## Problems Identified

1. **invite-employee edge function 400 error**: The email passed to Supabase auth isn't trimmed. Also, the redirect URL uses `supabaseUrl.replace(".supabase.co", ".lovable.app")` which produces a wrong domain (`tgdhglzegfbmdnzvseaa.lovable.app` instead of the actual app URL). The function should use the request origin or a known app URL.

2. **RoutesTab filters out active jobs**: Line 104 filters `.in("status", ["scheduled", "in_progress"])` — but the employee status flow uses `accepted`, `on_route`, `on_site`. Once a tech accepts a job, it vanishes from the admin Routes view and realtime notifications are invisible. This needs to include all active statuses.

3. **Employee login flow**: The login page itself works, but the user `siyespinaci@yahoo.com` hasn't been successfully invited (the invite failed with 400). Once the edge function is fixed and the invite re-sent, login will work.

4. **Maps**: The RouteMap and EmployeeJobMap implementations look correct, using plain Leaflet + MapTiler via the `get-maptiler-key` edge function. The employee map requires jobs with client `lat`/`lng` data — if sample clients lack coordinates, the map won't render.

## Changes

### 1. Fix invite-employee edge function
- Trim email before use: `const trimmedEmail = email.trim().toLowerCase()`
- Fix redirect URL: use the `Origin` or `Referer` header from the request instead of constructing from supabase URL
- Redeploy the function

### 2. Fix RoutesTab status filter
- Change `.in("status", ["scheduled", "in_progress"])` to `.in("status", ["scheduled", "accepted", "on_route", "on_site", "in_progress"])` so admin sees all active jobs and receives realtime status updates

### 3. Enable siyespinaci@yahoo.com as employee
- After fixing and redeploying the edge function, the admin can re-send the invite from the Team tab
- Or we can directly invoke the fixed function to set up this user

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/invite-employee/index.ts` | Trim email, fix redirect URL |
| `src/components/admin/RoutesTab.tsx` | Expand status filter to include all active statuses |

