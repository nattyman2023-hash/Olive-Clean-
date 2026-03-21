

# Plan: Manual Assignment & Reassignment for Jobs

## Overview
Add employee assignment controls to the Jobs tab so managers can manually assign/reassign technicians to jobs. When creating a new job, optionally assign an employee. In the job detail panel, show who's assigned and allow reassignment via a dropdown.

## Changes

### 1. Update JobsTab — Job interface & data fetching
- Add `assigned_to` and `employees` join to the Job interface
- Fetch employees list (already fetching clients)
- Include `assigned_to` in the jobs query select and join `employees(name, photo_url)` via `assigned_to`

### 2. Update JobsTab — Create form
- Add an "Assign To" dropdown (optional) in the new job form, listing all employees
- Pass `assigned_to` to the insert call

### 3. Update JobsTab — Detail panel: show assignment & reassign
- Show current assignment with employee name/avatar in the detail panel
- Add "Reassign" dropdown that updates `assigned_to` on the job
- Show "Unassigned" state when no employee is assigned

### 4. Update JobsTab — Job list cards
- Show assigned employee name as a small badge on each job card

### 5. Update BookingsTab — Auto-create job on confirm
- When a booking is confirmed, optionally auto-create a job in the `jobs` table with status `scheduled` (no auto-assign yet — manager assigns manually or uses auto-assign on Routes tab)

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/JobsTab.tsx` | Add `assigned_to` field to interface, form, detail panel with reassign dropdown, and job cards |

No database changes needed — `assigned_to` column already exists on `jobs` table.

