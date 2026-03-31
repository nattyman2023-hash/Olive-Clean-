

# Phase 1 — Loyalty & Special Programs

## What Exists Today
- **perks_members** table with `client_id`, `discount_percent`, `flexibility_zone`, `status`, `notes`
- **perks_offers** table for gap-filling cancelled slots to perks members
- Admin **PerksTab** for enrolling members, managing status, and a Gap Filler tool
- Public **PerksSection** on the homepage marketing the Olive Perks Club
- No tracking of completed cleanings count, no referral system, no program categories, no milestone rewards

## What We're Building

### A. Database Changes

**1. New table: `loyalty_programs`**
Defines the special programs (Friends & Family, Veterans, Retired, Loyalty Club) with their discount rules and benefits.

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | |
| name | TEXT | "Friends & Family", "Veterans", "Retired", "Loyalty Club" |
| discount_percent | INTEGER | Default discount for this program |
| description | TEXT | Admin-facing description |
| benefits | JSONB | Structured list of perks (free cleaning interval, referral reward, milestone rewards) |
| is_active | BOOLEAN | Enable/disable program |

**2. Extend `perks_members` table**
- Add `program_type` TEXT column (default `'loyalty_club'`) — links to program name
- Add `cleanings_completed` INTEGER (default 0) — tracks paid cleanings toward free cleaning milestone
- Add `free_cleanings_earned` INTEGER (default 0) — accumulated free cleanings
- Add `free_cleanings_used` INTEGER (default 0)
- Add `referral_code` TEXT (unique) — auto-generated for referral tracking
- Add `referred_by` UUID (nullable) — links to the member who referred them

**3. New table: `loyalty_milestones`**
Tracks milestone events (free cleaning earned, 6-month dusting reward, referral credited).

| Column | Type |
|---|---|
| id | UUID PK |
| member_id | UUID |
| milestone_type | TEXT | `'free_cleaning'`, `'complimentary_dusting'`, `'referral_reward'` |
| triggered_at | TIMESTAMPTZ |
| redeemed | BOOLEAN |
| job_id | UUID (nullable) |

### B. Admin UI Changes — PerksTab Overhaul

**Program Management Section**
- Dropdown/tabs to filter members by program type
- Enroll form gets a "Program" selector (Loyalty Club, Friends & Family, Veterans, Retired)
- Each program shows its discount rate and benefits

**Member Detail Panel Enhancements**
- Show `cleanings_completed` / threshold for next free cleaning
- Show earned vs used free cleanings
- Show referral code and count of successful referrals
- Show milestone history (complimentary dusting at 6 months, etc.)
- Button to manually award a free cleaning or milestone

**Loyalty Tracker**
- When a job is marked "completed" for a loyalty member, auto-increment `cleanings_completed`
- When threshold is reached (e.g., every 10 cleanings), auto-increment `free_cleanings_earned` and insert a milestone record
- At 6 months membership, auto-create a "complimentary dusting" milestone

### C. Client Portal — Loyalty Status

Add a "Loyalty" section to the Client Dashboard Home tab:
- Current program name and discount
- Progress bar toward next free cleaning
- Referral code with copy button
- List of earned rewards and redemption status

### D. Referral System

- Each member gets a unique referral code on enrollment
- New booking form accepts an optional referral code field
- When a referred client completes their first paid cleaning, the referrer earns a reward (tracked via milestone)

## Files Modified / Created

| File | Action |
|---|---|
| Migration: `create_loyalty_programs` | New — programs table, extend perks_members, milestones table |
| `src/components/admin/PerksTab.tsx` | Major edit — program filter, enhanced detail panel, milestone display |
| `src/pages/ClientDashboard.tsx` | Edit — add Loyalty status section |
| `src/components/client/BookingSection.tsx` | Edit — add referral code field |
| `src/components/admin/JobsTab.tsx` | Edit — increment loyalty counter on job completion |

## Implementation Order
1. Database migration (tables + columns + RLS)
2. Admin PerksTab overhaul (program management, milestones, enhanced detail)
3. Auto-increment logic on job completion
4. Client portal loyalty section
5. Referral code on booking form

