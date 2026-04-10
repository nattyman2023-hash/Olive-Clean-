

## Mobile-Optimized Detail Panels: Use Drawers on Small Screens

### Problem
When you tap a job, booking, or client on mobile/tablet, the detail panel renders below the list — forcing you to scroll down to see it. This is poor UX on small screens.

### Solution
Use the existing **Drawer** component (bottom sheet) on mobile/tablet screens, while keeping the current side panel on desktop. The `useIsMobile` hook already exists and detects screens under 768px. We will extend this to also cover tablets (under 1024px, matching the `lg:` breakpoint where the grid switches).

### Affected Tabs
1. **JobsTab** — Job detail panel becomes a Drawer on mobile/tablet
2. **BookingsTab** — Booking detail panel becomes a Drawer on mobile/tablet
3. **ClientsTab** — Client detail panel becomes a Drawer on mobile/tablet

### How It Works
- Add a `useIsDesktop` check (viewport >= 1024px, matching `lg:` breakpoint)
- On desktop: keep the existing `lg:grid-cols-3` side panel layout (no change)
- On mobile/tablet: hide the grid column entirely; when an item is selected, open a **Drawer** (bottom sheet) containing the same detail content
- The Drawer gets a close button and proper `DrawerTitle`/`DrawerDescription` for accessibility
- Clicking an item on mobile opens the drawer; closing the drawer clears the selection

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/use-mobile.tsx` | Add `useIsDesktop()` hook (>= 1024px) |
| `src/components/admin/JobsTab.tsx` | Wrap `JobDetailPanel` in conditional Drawer vs inline panel |
| `src/components/admin/BookingsTab.tsx` | Wrap detail panel in conditional Drawer vs inline panel |
| `src/components/admin/ClientsTab.tsx` | Wrap detail panel in conditional Drawer vs inline panel |

### Pattern (applied to all 3 tabs)
```text
if (isDesktop) {
  render detail panel inline in the grid (existing behavior)
} else {
  render a <Drawer> that opens when `selected` is set
  Drawer contains the same detail content
  closing the Drawer calls setSelected(null)
}
```

No new dependencies needed — Drawer component already exists in the project.

