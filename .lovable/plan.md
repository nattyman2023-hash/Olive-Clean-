

# Add Advanced Filtering to Jobs Tab

## Current State
The Jobs tab has a text search and status filter buttons. No date range, employee, service, or location filters exist.

## Plan

### Changes to `src/components/admin/JobsTab.tsx`

Add a collapsible filter bar below the existing toolbar with:

1. **Date range filter** — Two date inputs (from/to) using native `input[type="date"]` to filter `scheduled_at`
2. **Employee filter** — A `<select>` dropdown populated from the existing `employees` state, filtering by `assigned_to`
3. **Service filter** — A `<select>` dropdown using the existing `SERVICES` array
4. **Location filter** — A `<select>` dropdown of unique neighborhoods from `clients` data (already fetched via jobs query which includes `clients(neighborhood)`)

New state variables:
- `dateFrom`, `dateTo` (strings)
- `employeeFilter` (string, default `"all"`)
- `serviceFilter` (string, default `"all"`)
- `neighborhoodFilter` (string, default `"all"`)

Update the `filtered` computation to apply all filters alongside the existing search and status filter.

Add a "Filters" toggle button with a `Filter` icon next to the existing toolbar. Show an active filter count badge. Add a "Clear filters" button when any filter is active.

### UI Layout
- Filter row appears between toolbar and content when toggled
- Styled consistently with existing card/border patterns
- Responsive: stacks on mobile, inline on desktop

### Files Modified
- `src/components/admin/JobsTab.tsx` — Add filter state, filter UI, update filtering logic

