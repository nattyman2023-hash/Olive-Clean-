

# Plan: Cross-Tech Drag-and-Drop Assignment + Mobile Footer

## 1. Drag-and-Drop Job Assignment Between Technicians

Currently, drag-and-drop only reorders jobs within the same technician group. We need to support dragging a job from one technician's column to another, which reassigns the job.

### Changes to `src/components/admin/RoutesTab.tsx`
- Track `dragSourceGroup` (which tech group the dragged job came from) alongside `draggedJob`
- Update `handleDrop` to detect cross-group drops: when `dragSourceGroup !== targetTechName`, update the job's `assigned_to` field to the target technician's `user_id` in addition to reordering
- Add a new mutation `reassignMutation` that updates `assigned_to` on the job
- Add a visual drop zone at the bottom of each tech group (a dashed border area saying "Drop here to assign") that appears when dragging
- Show a visual indicator on the target group header when dragging over it

### Changes to `src/components/admin/routes/RouteJobCard.tsx`
- Pass `onDragEnd` prop to clear drag state when drag is cancelled
- Add `data-job-id` for accessibility

## 2. Mobile-Optimized Footer

The current footer has 7 links in a single horizontal `flex` row with `gap-6` — on a 407px viewport these wrap awkwardly and are hard to tap.

### Changes to `src/components/Footer.tsx`
- Reduce padding on mobile: `py-10 sm:py-16`
- Grid: change to `grid-cols-2` on mobile (brand + contact side by side, services + areas side by side) instead of stacking all 4 vertically
- Bottom links: restructure into a 2-column grid on mobile (`grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:gap-6`) so links are tappable with proper spacing
- Increase tap target size on mobile: `py-1` on link items
- Reduce gap between grid sections on mobile: `gap-8 sm:gap-12`
- Make copyright and links stack centered on mobile

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/RoutesTab.tsx` | Cross-group drag-and-drop with `assigned_to` reassignment |
| `src/components/admin/routes/RouteJobCard.tsx` | Add `onDragEnd` support |
| `src/components/Footer.tsx` | Mobile-responsive layout for links and grid |

