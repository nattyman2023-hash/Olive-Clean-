

# Plan: Fix Maps with MapTiler + Add Delete for Clients/Employees

## Problem
The route map crashes with `render2 is not a function` — a React Context.Consumer incompatibility between `react-leaflet` v5 and React 18. The employee dashboard has no map. Both need MapTiler tiles.

## Solution

### 1. Replace react-leaflet with plain Leaflet + MapTiler tiles

Remove `react-leaflet` dependency. Rewrite `RouteMap.tsx` to use plain Leaflet (imperative API with `useRef` + `useEffect`) which avoids the React context issue entirely.

- **`src/components/admin/routes/RouteMap.tsx`**: Rewrite using `L.map()`, `L.marker()`, `L.polyline()` directly in a `useEffect`. Use MapTiler tile URL: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=<KEY>`. The MapTiler API key is already stored as a secret — expose it via an edge function or embed it as a `VITE_` env var (it's a publishable map key, safe for client-side).
- Remove `react-leaflet` and `@types/leaflet` from dependencies. Keep `leaflet` for the core library.

### 2. Add map to Employee Dashboard

Add a small map card in `EmployeeDashboard.tsx` showing today's job locations with numbered markers for the job sequence. Uses same plain Leaflet + MapTiler approach.

### 3. Delete clients feature

- **Database migration**: Add DELETE RLS policy on `clients` table for admin role
- **`ClientsTab.tsx`**: Add a "Delete" button in the client detail panel with a confirmation dialog. Calls `supabase.from("clients").delete().eq("id", id)`.

### 4. Delete employees feature

- **Database migration**: Add DELETE RLS policy on `employees` table for admin role
- **`TeamTab.tsx`**: Add a "Delete" button on employee records with confirmation. Calls `supabase.from("employees").delete().eq("id", id)`.

### 5. MapTiler API key

The secret `MapTiler` exists as a runtime secret. Since map tile URLs are loaded client-side, we need it as a build-time env var. Add `VITE_MAPTILER_KEY` to the `.env` by reading the existing secret value, or reference it directly in code. Since it's a publishable key, it's safe to store in the codebase.

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | DELETE RLS policies for `clients` and `employees` |
| `src/components/admin/routes/RouteMap.tsx` | Rewrite with plain Leaflet + MapTiler tiles |
| `src/pages/EmployeeDashboard.tsx` | Add job location map using plain Leaflet |
| `src/components/admin/ClientsTab.tsx` | Add delete button with confirmation |
| `src/components/admin/TeamTab.tsx` | Add delete button with confirmation |
| `package.json` | Remove `react-leaflet` |

