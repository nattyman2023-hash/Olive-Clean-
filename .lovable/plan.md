## Performance Optimization Pass

Five focused changes to reduce initial bundle size on every surface (public, admin, employee, client) without splitting into subdomains. No feature changes — purely how code is loaded.

---

### 1. Lazy-load `ChatWidget` on public pages

**Problem:** `ChatWidget` imports `react-markdown` and the full Supabase client, and currently loads on every public page even when the user never opens it.

**Fix:** In `src/App.tsx`, convert `ChatWidget` to `React.lazy`. Inside `ConditionalChatWidget`, render a tiny always-visible floating button (plain HTML, no deps). Only mount the lazy `<ChatWidget />` after the user clicks it the first time.

**Win:** ~50–80 KB removed from every public page's initial load.

---

### 2. Lazy-load every admin tab in `AdminDashboard.tsx`

**Problem:** `AdminDashboard.tsx` eagerly imports all 19 tabs (Jobs, Routes, Analytics, Finance, Quotes, Hiring, Emails, etc.). Opening "Leads" forces the browser to also download Recharts, MapTiler GL, dnd-kit, and every Radix primitive used anywhere in admin.

**Fix:** Convert all tab imports to `React.lazy()`, wrap `renderSection`'s output in a single `<Suspense fallback={<Loader2 />}>`. Each tab becomes its own chunk that downloads only when the admin clicks that sidebar item.

**Win:** Initial admin load drops dramatically (likely 60–70%). Tab switches show a brief spinner the first time, then are instant (cached).

---

### 3. Lazy-load map components inside their tabs

**Problem:** `JobsMap`, `RouteMap`, `EmployeeJobMap` pull in MapTiler SDK + map GL libraries (~200–400 KB). Currently loaded as soon as the parent tab opens, even if the user stays in List view.

**Fix:**
- `JobsTab.tsx` → lazy-import `JobsMap`, only render when user toggles to map view
- `RoutesTab.tsx` → lazy-import `RouteMap` (already partially lazy — verify and finish)
- `EmployeeDashboard` → lazy-import `EmployeeJobMap`

**Win:** Admins/employees who don't use map view never download map libs.

---

### 4. Manual vendor chunk splitting in `vite.config.ts`

**Problem:** Default Vite bundling lumps all `node_modules` into one big `vendor` chunk that gets invalidated on every dependency change.

**Fix:** Add `build.rollupOptions.output.manualChunks` to `vite.config.ts` grouping libs:
- `react-vendor`: react, react-dom, react-router-dom
- `radix-vendor`: all `@radix-ui/*`
- `query-vendor`: @tanstack/react-query, supabase client
- `charts-vendor`: recharts, date-fns
- `dnd-vendor`: @dnd-kit/*
- `map-vendor`: maptiler-related libs
- `markdown-vendor`: react-markdown

**Win:** Better long-term browser caching — changing one feature doesn't invalidate the entire vendor bundle. Parallel chunk downloads.

---

### 5. Audit `lucide-react` and barrel imports

**Problem:** Pages like `AdminDashboard` import many icons; if any file uses `import * as Icons from 'lucide-react'`, the whole icon set ships.

**Fix:** Quick `rg` audit to confirm all `lucide-react` imports are named (e.g. `import { Loader2 } from 'lucide-react'`). Same for any barrel files in `@/components/ui`. Fix any offenders.

**Win:** Small but easy — a few KB per page.

---

### Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Lazy `ChatWidget`, mount on first click only |
| `src/pages/AdminDashboard.tsx` | Convert all 19 tab imports to `React.lazy` + `Suspense` wrapper |
| `src/components/admin/JobsTab.tsx` | Lazy `JobsMap`, render only in map view |
| `src/components/admin/RoutesTab.tsx` | Verify/complete lazy `RouteMap` |
| `src/pages/EmployeeDashboard.tsx` | Lazy `EmployeeJobMap` |
| `vite.config.ts` | Add `manualChunks` config |
| (audit pass) | Fix any wildcard `lucide-react` or barrel imports |

---

### What Stays the Same

- All features, routes, auth, RBAC
- Visual design and UX (only difference: brief spinner first time you open a heavy tab)
- No subdomain split — keeping single deploy
- No database changes, no new dependencies

---

### Optional Follow-up (not in this pass)

After deploy, run a real performance profile to measure improvement. If public marketing pages are still heavy after this pass, *then* consider splitting admin/employee/client portals into a subdomain.
