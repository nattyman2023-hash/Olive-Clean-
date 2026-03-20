

# Plan: Seed Sample Jobs for Daily Routes Demo

## What

Insert 8 sample jobs scheduled for today across multiple clients, technicians, neighborhoods, and service types so the Routes tab has meaningful data to demonstrate geographic clustering, zone grouping, drag-and-drop reordering, and efficiency metrics.

## Sample Data

Using existing clients and employees:

| Time | Client | Neighborhood | Tech | Service | Duration | Drive |
|------|--------|-------------|------|---------|----------|-------|
| 8:00 AM | Margaret Whitfield | Belle Meade | Maria Santos | Deep Clean | 120m | 15m |
| 8:30 AM | James & Alicia Drummond | Green Hills | Aisha Johnson | Standard Clean | 90m | 10m |
| 10:30 AM | The Richardson Family | Belle Meade | Maria Santos | Standard Clean | 90m | 8m |
| 10:00 AM | Dr. Priya Nair | Green Hills | Aisha Johnson | Move-Out Clean | 150m | 12m |
| 1:00 PM | Margaret Whitfield | Belle Meade | Maria Santos | Window Treatment | 60m | 5m |
| 1:30 PM | James & Alicia Drummond | Green Hills | Aisha Johnson | Standard Clean | 90m | 10m |
| 3:30 PM | The Richardson Family | Belle Meade | Unassigned | Deep Clean | 120m | — |
| 4:00 PM | Dr. Priya Nair | Green Hills | Unassigned | Standard Clean | 90m | — |

This gives:
- **2 techs** with 3 jobs each (for tech grouping + utilization metrics)
- **2 unassigned** jobs (visible in "Unassigned" group)
- **2 neighborhoods** (Belle Meade + Green Hills) for zone grouping demo
- Mixed services and durations for variety
- Drive time estimates for route efficiency display

## Technical Details

- Single database migration inserting 8 rows into `jobs` table
- Uses today's date dynamically via `CURRENT_DATE` so jobs always appear on "today"
- References existing `client_id` and `assigned_to` (employee `user_id`) values
- All jobs set to `status = 'scheduled'`
- The existing job for Dr. Nair at 2 PM stays as-is

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Insert 8 sample jobs for today |

