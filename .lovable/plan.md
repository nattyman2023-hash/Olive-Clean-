

# Phase 1 Enhancements — 6-Month Dusting + Referral Linking

## Three Changes

### 1. Automatic 6-Month Complimentary Dusting Milestone

**Where**: `src/components/admin/JobsTab.tsx` — inside the `updateJobStatus` function, after the free cleaning check (around line 229).

**Logic**: After incrementing `cleanings_completed`, check if the member's `joined_at` is ≥ 6 months ago. If so, query `loyalty_milestones` for an existing `complimentary_dusting` milestone for that member. If none exists, insert one automatically.

### 2. Store Referral Code on Booking Request + Link Referrer

**Database**: Add a `referral_code` TEXT column to `booking_requests` table (migration).

**BookingSection.tsx**: Already has the referral code input — update `handleSubmit` to include `referral_code` in the insert payload.

**BookingsTab.tsx**: When admin confirms a booking, look up the referral code in `perks_members`. If found, when the new client's first job is completed (handled in JobsTab), award a `referral_reward` milestone to the referrer.

**JobsTab.tsx**: On job completion, also check if the client was referred (via `perks_members.referred_by`). If so, and if no `referral_reward` milestone exists for the referrer for this client, insert one.

### 3. Wire Referral Code During Client Onboarding

**BookingsTab.tsx**: When confirming a booking, if a referral code was provided, look up the referring `perks_member` and store the `referred_by` reference when auto-enrolling or when creating the client record. This links the new client to the referrer for future milestone tracking.

## Files Modified

| File | Change |
|---|---|
| `migration` | Add `referral_code` column to `booking_requests` |
| `src/components/client/BookingSection.tsx` | Pass `referral_code` in insert payload |
| `src/components/admin/JobsTab.tsx` | Add 6-month dusting check + referral reward on completion |
| `src/components/admin/BookingsTab.tsx` | On confirm, look up referral code and link referred_by on the new perks member |

## Implementation Order
1. Database migration (add `referral_code` to `booking_requests`)
2. BookingSection — include referral code in insert
3. JobsTab — add 6-month dusting auto-milestone + referral reward logic
4. BookingsTab — link referral code to referred_by on confirmation

