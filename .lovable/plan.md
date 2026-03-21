

# Plan: Fix Map Display, Job Loading, and Popup Issues

## Root Causes Identified

### 1. Jobs failing to load in JobsTab
The query in `JobsTab.tsx` line 89 does `employees(name, photo_url)` join, but there is **no foreign key** from `jobs.assigned_to` to `employees.id`. The `assigned_to` column stores `user_id` (not `employees.id`), so this join fails entirely, causing "Failed to load jobs."

**Fix:** Replace the implicit join with a manual lookup. Fetch employees separately (already done) and match by `user_id` in the UI instead of relying on a broken FK join.

### 2. Employee map showing only 1-2 jobs
The employee dashboard query (line 69) selects `clients(name, address, neighborhood, preferences)` — it's **missing `lat` and `lng`**. The `EmployeeJobMap` filters on `j.clients?.lat != null && j.clients?.lng != null`, so jobs without these fields are excluded.

**Fix:** Add `lat, lng` to the clients select in the employee dashboard query.

### 3. Map popups not working on click
The Leaflet markers use `bindPopup()` which should work. However, `scrollWheelZoom: false` combined with the map container intercepting events may cause issues. Will verify the popup HTML is valid and the map initializes correctly.

## Changes

### File: `src/components/admin/JobsTab.tsx`
- Remove `employees(name, photo_url)` from the Supabase query select
- After fetching jobs, match `assigned_to` against the already-fetched `employees` list (by comparing `assigned_to` with employee `id` — but wait, `assigned_to` stores `user_id` not `id`)
- Need to check: does `assigned_to` store `employees.id` or `employees.user_id`?
- Based on RoutesTab (which uses `employeeMap[e.user_id]`), `assigned_to` stores `user_id`
- So: fetch employees with `id, name, photo_url, user_id`, then build a lookup map by `user_id` to manually populate the employee info on each job

### File: `src/pages/EmployeeDashboard.tsx`
- Line 69: Change `clients(name, address, neighborhood, preferences)` to `clients(name, address, neighborhood, preferences, lat, lng)`

### File: `src/components/employee/EmployeeJobMap.tsx`
- Ensure map `fitBounds` works correctly with all jobs that have coordinates
- No structural changes needed — the missing data was the root cause

## Technical Details

| File | Change |
|------|--------|
| `src/components/admin/JobsTab.tsx` | Remove broken `employees()` join; manually map employee data using `user_id` lookup |
| `src/pages/EmployeeDashboard.tsx` | Add `lat, lng` to the clients select query |

No database changes needed.

