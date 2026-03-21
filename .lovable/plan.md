

# Plan: Footer Link, Client Booking, Employee Photos, and Access Setup

## Changes Overview

### 1. Add Employee Portal link to Footer
**File:** `src/components/Footer.tsx`
- Add "Employee Portal" link pointing to `/employee/login` in the footer links row (next to "Staff Login")

### 2. Add "Book a Cleaning" section to Client Dashboard
**File:** `src/pages/ClientDashboard.tsx`
- Add a new section between the header and upcoming appointments showing all 4 service packages (Essential, General, Signature Deep, Makeover Deep) with descriptions and starting prices
- Each package has a "Book Now" button that opens a booking dialog
- The dialog collects: preferred date/time, frequency, and optional notes
- On submit, insert into `booking_requests` table (already allows public inserts) pre-filled with the client's name, email, phone, and address
- Allow adding multiple services in a single booking session (an "Add Another Service" button that appends to a list before final submission)

### 3. Employee Profile Photo
**Database migration:**
- Add `photo_url TEXT` column to `employees` table

**Storage:**
- Create `employee_photos` public storage bucket with RLS policies (admin + staff owner can upload, public can read)

**File:** `src/components/admin/TeamTab.tsx`
- Add photo upload button on employee detail view (avatar area) that uploads to `employee_photos` bucket and saves URL to `photo_url`

**File:** `src/pages/EmployeeDashboard.tsx`
- Show employee's photo in the header instead of the "O" logo placeholder

**File:** `src/pages/ClientDashboard.tsx`
- For upcoming appointments, query the assigned employee's name and photo_url via the jobs -> employees join
- Display a small avatar with the technician's name and photo next to each upcoming job card ("Your technician: [photo] Sarah")

### 4. Set up siyespinaci@gmail.com as employee
**Database operations (via insert tool):**
- Create employee record for siyespinaci@gmail.com if not exists
- After the edge function is deployed, invoke `invite-employee` to create auth account, assign staff role, and link

### 5. Auto-link hired employees to dashboard access
The current flow already handles this: when admin clicks "Send Login Invite" on an employee record, the `invite-employee` edge function creates the auth account, assigns the `staff` role, and links the employee record. No additional changes needed — this is already the intended workflow.

---

## Technical Details

### Database Migration SQL
```sql
-- Add photo_url to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create employee_photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('employee_photos', 'employee_photos', true);

-- Storage RLS: anyone can view
CREATE POLICY "Public can view employee photos" ON storage.objects FOR SELECT USING (bucket_id = 'employee_photos');

-- Admin can upload
CREATE POLICY "Admin can upload employee photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee_photos' AND public.has_role(auth.uid(), 'admin'));

-- Staff can upload own photos (path starts with their user_id)
CREATE POLICY "Staff can upload own photo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee_photos' AND public.has_role(auth.uid(), 'staff'));
```

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `photo_url` column, create `employee_photos` bucket |
| `src/components/Footer.tsx` | Add Employee Portal link |
| `src/pages/ClientDashboard.tsx` | Add booking section with packages, show assigned technician photo/name |
| `src/components/admin/TeamTab.tsx` | Add photo upload on employee profile |
| `src/pages/EmployeeDashboard.tsx` | Show employee photo in header |
| Data operation | Create employee record and invoke invite for siyespinaci@gmail.com |

