

## Remove Bookings as a Separate Section — Merge into Leads

### The Problem
"Bookings" is a redundant parallel path. The app already has a clean pipeline: **Leads → Quotes → Jobs**. The Bookings tab does the same thing (intake → confirm → create job) but through a separate table and UI, creating confusion about where to look for incoming requests.

### The Fix

**Merge client booking requests into the Leads pipeline** and remove "Bookings" as a standalone section.

### Changes

#### 1. Reroute Client Booking Form to Leads
**`src/components/client/BookingSection.tsx`** — When a client submits a booking request, insert into the `leads` table instead of `booking_requests`:
- Map service/frequency/home details into the lead record
- Set `source = "client_portal"` and `status = "new"`
- Set score higher (e.g. 80) since these are warm — they're existing clients requesting service

#### 2. Also handle the public Book page
**`src/pages/BookPage.tsx`** — Same logic: submissions go to `leads` instead of `booking_requests`

#### 3. Enhance Leads to handle booking-style data
**`src/components/admin/LeadsTab.tsx`** — Add visual distinction for leads from client portal vs. other sources (badge: "Portal Request" vs "Website" vs "Manual"). The existing "Create Quote" fast-track already works perfectly for converting these.

#### 4. Remove Bookings from sidebar & dashboard
- **`src/components/admin/AdminSidebar.tsx`** — Remove "Bookings" from the Operations group
- **`src/pages/AdminDashboard.tsx`** — Remove BookingsTab import and case

#### 5. Migrate existing booking_requests data
- **Database migration** — Insert the 6 existing `booking_requests` records into `leads` with `source = "booking_migration"`, then optionally mark the old table as deprecated (don't drop it yet)

### Files Summary

| File | Action |
|------|--------|
| `src/components/client/BookingSection.tsx` | Insert into `leads` instead of `booking_requests` |
| `src/pages/BookPage.tsx` | Same reroute to `leads` |
| `src/components/admin/LeadsTab.tsx` | Add source badges; handle booking-specific fields |
| `src/components/admin/AdminSidebar.tsx` | Remove "Bookings" nav item |
| `src/pages/AdminDashboard.tsx` | Remove BookingsTab import/case |
| Database migration | Migrate existing records; add booking fields to leads if missing |

### Result
One clean pipeline: **All inquiries → Leads → Quotes → Jobs**. No more wondering "is this in Bookings or Leads?"

