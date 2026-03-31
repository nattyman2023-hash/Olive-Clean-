

# Fix: Admin Dashboard Tab Navigation Flickering

## Problem

The tab navigation (Bookings, Clients, Jobs, etc.) flickers because it's conditionally rendered based on `rolesLoading` (lines 96-117 in `AdminDashboard.tsx`). When `rolesLoading` toggles — which happens on auth state changes, token refreshes, or role re-checks — the entire `TabsList` is unmounted and replaced with skeletons, then re-mounted. This causes the visible "disappear and reappear" effect.

## Fix

**Always render the `TabsList`** — never swap it out for skeletons. Instead, use a subtle opacity transition or simply show all tabs immediately. The `rolesLoading` state should only gate the *content* of admin-only tabs (which it already does via `AdminGate`), not the tab bar itself.

### Changes to `src/pages/AdminDashboard.tsx`

Remove the `rolesLoading ? <Skeleton> : <TabsList>` conditional (lines 96-117). Replace with the `TabsList` rendered unconditionally:

```tsx
<ScrollArea className="w-full">
  <TabsList className="...">
    {ADMIN_TABS.map((tab) => (
      <TabsTrigger key={tab.value} value={tab.value} className="...">
        {tab.label}
      </TabsTrigger>
    ))}
  </TabsList>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

This is a single-file, ~5-line change. The tab content sections already handle the admin gate, so no other changes needed.

