

# GPS Clock In/Out & Verified Attendance

## Overview
Add a point-in-time geolocation clock-in/clock-out system. Employees tap "Clock In" on a job, the browser captures GPS, the system validates proximity to the job site, and admins see verified attendance data with a map.

---

## 1. Database Migration

**New table: `job_time_logs`**
```sql
CREATE TABLE public.job_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('clock_in', 'clock_out')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  is_verified_location BOOLEAN DEFAULT false,
  distance_from_site FLOAT
);

ALTER TABLE public.job_time_logs ENABLE ROW LEVEL SECURITY;

-- Staff can insert their own logs
CREATE POLICY "Staff can insert own time logs" ON public.job_time_logs
  FOR INSERT TO authenticated
  WITH CHECK (employee_user_id = auth.uid() AND has_role(auth.uid(), 'staff'));

-- Staff can view own logs
CREATE POLICY "Staff can view own time logs" ON public.job_time_logs
  FOR SELECT TO authenticated
  USING (employee_user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin full access time logs" ON public.job_time_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

Note: `employee_user_id` references `auth.users(id)` pattern (matching how `assigned_to` works on `jobs`). No FK to `auth.users` per project conventions.

---

## 2. Employee Dashboard — Clock In/Out UI

**Changes to `src/pages/EmployeeDashboard.tsx` (inside `JobCard` component)**

- Add a **"Clock In" / "Clock Out" button** that appears based on job status:
  - Show "Clock In" when job is `on_site` and no clock_in log exists
  - Show "Clock Out" when a clock_in exists but no clock_out
  - Show verified badge when both exist
- On click:
  1. Call `navigator.geolocation.getCurrentPosition()`
  2. Calculate distance to `job.clients.lat/lng` using Haversine formula
  3. Mark `is_verified_location = true` if distance < 200m, flag yellow if > 200m
  4. Insert row into `job_time_logs`
  5. Show toast with verification status (green checkmark or yellow warning)
- Query existing time logs for each job to determine button state
- Display elapsed time between clock-in and current time as a live counter

**New utility**: `src/lib/geo.ts`
- `haversineDistance(lat1, lng1, lat2, lng2): number` — returns meters
- Used by both employee and admin views

---

## 3. Admin Dashboard — Attendance & Verification Card

**Changes to `src/components/admin/JobsTab.tsx`**

- When a job is selected/expanded, add an **"Attendance & Verification"** card section showing:
  - Clock-in time, clock-out time, total verified duration
  - Verification status badges (Green: on-site, Yellow: flagged)
  - Distance from site in meters
  - A small MapTiler map (reusing `useMapTilerKey`) with two pins: job address vs actual clock-in location
- Fetch `job_time_logs` for the selected job
- Show "Expected: X min" vs "Actual: Y min" comparison

---

## 4. Privacy Design

- GPS is requested **only** on button click — no background tracking
- Location permission prompt handled gracefully with fallback messaging if denied
- A small "GPS only used at clock-in" note displayed near the button

---

## Files Summary

| File | Action |
|---|---|
| Migration SQL | New `job_time_logs` table with RLS |
| `src/lib/geo.ts` | New: Haversine distance utility |
| `src/pages/EmployeeDashboard.tsx` | Clock In/Out buttons in JobCard, geolocation capture, time log queries |
| `src/components/admin/JobsTab.tsx` | Attendance verification card with map, duration comparison |

## Implementation Order
1. Run database migration for `job_time_logs`
2. Create `geo.ts` utility
3. Add clock-in/out to employee JobCard
4. Add attendance card to admin JobsTab

