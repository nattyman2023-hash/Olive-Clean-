

# Plan: Real-time Notifications, Route Map, and Careers Page Fixes

## 1. Real-time Job Status Notifications (Admin Dashboard)

Enable Supabase Realtime on the `jobs` table and add a toast notification listener in `RoutesTab.tsx`:

- **Migration**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;`
- **RoutesTab.tsx**: Subscribe to `postgres_changes` on `jobs` table filtering for `UPDATE` events. When a technician changes status (e.g., "on_route" → "on_site"), show a toast notification with the tech name, client name, and new status. Auto-invalidate the route jobs query so the UI refreshes live.

## 2. Nashville Map Visualization (Routes Tab)

Add an interactive map component using Leaflet (free, no API key needed) below the route cards:

- **New file**: `src/components/admin/routes/RouteMap.tsx`
  - Renders a Leaflet map centered on Nashville (36.1627, -86.7816)
  - Plots job locations using client `lat`/`lng` from the `clients` table (already in schema)
  - Color-coded markers by zone (Belle Meade = amber, Green Hills = violet, etc.) matching existing `ZONE_COLORS`
  - Marker popups showing client name, service, and assigned tech
  - Polylines connecting jobs in sequence per technician
- **RoutesTab.tsx**: Add a map toggle button and render `RouteMap` when active
- **Dependencies**: `leaflet` + `react-leaflet` + types
- **Sample data update**: Migration to set `lat`/`lng` on existing sample clients (Nashville coordinates)

## 3. Careers Page — Add Navbar/Footer + Job-Specific Applications

**Header/Footer**: The Careers page currently has a custom inline header instead of the shared `Navbar` and `Footer`. Fix:
- Import and render `Navbar` at top and `Footer` at bottom of `Careers.tsx`
- Remove the custom inline header

**Apply to specific job**: 
- Add an "Apply Now" button on each job posting card that scrolls to the form and pre-selects that job
- Add a `job_posting_id` column (nullable UUID, FK to `job_postings`) to the `applicants` table so applications are linked to specific postings
- Show a dropdown/indicator in the form showing which position they're applying for (or "General Application")
- In `HiringTab.tsx`, show the linked job posting title on each applicant

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Enable realtime on jobs, add lat/lng to sample clients, add `job_posting_id` to applicants |
| `src/components/admin/RoutesTab.tsx` | Realtime subscription + toast, map toggle |
| `src/components/admin/routes/RouteMap.tsx` | New — Leaflet map with zone-colored pins and tech route lines |
| `src/pages/Careers.tsx` | Add Navbar + Footer, "Apply Now" per posting, job_posting_id in form state |
| `src/components/admin/HiringTab.tsx` | Show linked job posting on applicant cards |
| `package.json` | Add leaflet, react-leaflet, @types/leaflet |

