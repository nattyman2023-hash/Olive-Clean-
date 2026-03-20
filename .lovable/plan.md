

# CRM Phase Implementation

## Overview
Add three new database tables (clients, jobs, perks_members), refactor the admin dashboard with tabbed navigation, and add a Staff Login link to the footer.

## 1. Database Migration

Create `clients`, `jobs`, and `perks_members` tables with RLS policies allowing admin/staff access.

**clients** — name, email, phone, address, neighborhood, preferences (jsonb), notes, created_by (uuid)
**jobs** — client_id (FK→clients), service, status (scheduled/in_progress/completed/cancelled), scheduled_at, completed_at, assigned_to, duration_minutes, actual_duration_minutes, price, notes
**perks_members** — client_id (FK→clients), status (active/paused/cancelled), discount_percent (default 40), flexibility_zone, joined_at, notes

RLS: Admin and staff can SELECT/INSERT/UPDATE on clients and jobs. Admin-only on perks_members.

## 2. Footer Update
Add "Staff Login" link to the bottom bar of `src/components/Footer.tsx`, linking to `/admin/login`.

## 3. Admin Dashboard Refactor

Refactor `AdminDashboard.tsx` to use a tabbed layout with four tabs: **Bookings | Clients | Jobs | Perks**.

Extract existing bookings logic into `src/components/admin/BookingsTab.tsx` and create three new tab components:

- **BookingsTab** — current bookings list/detail (extracted from AdminDashboard)
- **ClientsTab** — list clients with search/filter by neighborhood, add/edit client form with JSONB preferences editor, view job history
- **JobsTab** — list jobs with status/client/date filters, create job (select client, service, date, assign tech), update status and log duration
- **PerksTab** — list Perks members with status badges, enroll client, simple "Gap Filler" view showing nearby members when a job cancels

## Files to Create/Edit
- **Migration**: New SQL migration for 3 tables + RLS
- **Edit**: `src/components/Footer.tsx` — add Staff Login link
- **Edit**: `src/pages/AdminDashboard.tsx` — tabbed navigation shell
- **Create**: `src/components/admin/BookingsTab.tsx`
- **Create**: `src/components/admin/ClientsTab.tsx`
- **Create**: `src/components/admin/JobsTab.tsx`
- **Create**: `src/components/admin/PerksTab.tsx`

