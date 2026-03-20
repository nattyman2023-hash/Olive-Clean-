

# Fix Employee UUID Error + Seed Sample Data

## Problem
The "Add Employee" form has an "Auth User ID" field with placeholder text "UUID". When left empty, the code falls back to `emp.user_id || crypto.randomUUID()`, but when the user types nothing and the field contains empty string `""`, it passes that through. The real issue is the field shouldn't be exposed to the user at all for basic employee creation — it should auto-generate a UUID.

## Fix 1: TeamTab.tsx — Remove manual UUID field, auto-generate

**File:** `src/components/admin/TeamTab.tsx`

- Remove the `formUserId` state and the "Auth User ID" input field from the form
- In `handleSubmit`, always use `selectedEmployee?.user_id || crypto.randomUUID()` so new employees get a valid UUID automatically
- Keep the ability to see/link user_id only when editing (optional advanced field), or remove entirely since linking to auth users can be done via the database directly

## Fix 2: Seed sample data via database insert

Insert realistic sample data to populate the CRM:

**Clients** (5 records): Nashville-area households with JSONB preferences (gate codes, pet info, marble type, etc.)

**Employees** (4 records): Mix of active/onboarding statuses with certifications and onboarding progress

**Jobs** (6 records): Mix of scheduled, completed, and cancelled jobs linked to clients

**Feedback** (3 records): Star ratings and comments for completed jobs

**Perks Members** (2 records): Active members in different flexibility zones

This gives the admin dashboard meaningful data across all tabs — Bookings, Clients, Jobs, Perks, Analytics, and Team.

## Technical Notes
- Sample data inserted via the database insert tool (not migrations)
- Employee `user_id` will use generated UUIDs (not linked to real auth users, which is fine for demo data)
- Client `client_user_id` left null for sample data (no auth accounts created)
- All data uses Nashville neighborhoods matching the Olive Clean brand

