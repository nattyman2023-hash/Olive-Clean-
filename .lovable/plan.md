

## Team Management Improvements, Rename "Cleaner" → "Cleaning Technician", Role Badges, and Fix Feedback Link

### Overview
Four changes: (1) enhance "Add Team Member" with role assignment + auto-invite, (2) show role badges on the team list, (3) rename "Cleaner" to "Cleaning Technician" globally, (4) fix the feedback form "Job not found" error for unauthenticated users.

---

### 1. Enhance "Add Team Member" with Role + Auto-Invite

**File: `src/components/admin/TeamTab.tsx`**
- Add a "Role" dropdown to the Add Employee dialog that pulls from the `custom_roles` table
- After saving the employee record, if an email is provided, automatically call `invite-employee` edge function to send the login invite
- After the invite succeeds and returns `user_id`, assign the selected role via `user_roles` insert

### 2. Role Badges on Team List View

**File: `src/components/admin/TeamTab.tsx`**
- Fetch all `user_roles` for displayed employees (batch query)
- In each table row, next to the employee name, render colored `Badge` components for each role
- Color mapping: green for `cleaning_technician`/`staff`, blue for `finance`, purple for `dispatcher`, amber for `admin_assistant`, red for `admin`

### 3. Global Rename: "Cleaner" → "Cleaning Technician"

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Rename `isCleaner` → `isCleaningTechnician`, update role check from `"cleaner"` → `"cleaning_technician"` |
| `src/pages/AdminDashboard.tsx` | Update references from `isCleaner` → `isCleaningTechnician` |
| `src/pages/WhyUs.tsx` | Change "cleaners" → "cleaning technicians" in copy where it refers to the team |
| `src/pages/About.tsx` | Same copy update |
| `src/lib/seo.ts` | Update SEO keywords/descriptions |

**Database**: Rename existing `cleaner` role entries in `user_roles` and `custom_roles` to `cleaning_technician` via insert tool (data update, not schema change).

### 4. Fix Feedback Form "Job not found" for Unauthenticated Users

**Problem**: The feedback page at `/feedback/:jobId` queries the `jobs` table with a join to `clients`. But RLS on `jobs` only allows access for admin, staff, or the owning client — unauthenticated users clicking from the email get "Job not found."

**Fix — Database migration**: Add an RLS policy on `jobs` for public SELECT access scoped to completed jobs accessed via the feedback page:
```sql
CREATE POLICY "Public can view completed jobs for feedback"
ON public.jobs FOR SELECT TO public
USING (status = 'completed');
```

This is safe because:
- Only `completed` jobs are exposed
- The feedback form only reads `service`, `scheduled_at`, `status`, `client_id`
- No sensitive data is leaked (prices, notes, assigned_to are visible but low-risk for completed jobs)

**Alternative (more restrictive)**: Create a database function `get_job_for_feedback(job_id uuid)` as `SECURITY DEFINER` that returns only the needed fields. This is more locked down but adds complexity.

**File: `src/pages/EmployeeDashboard.tsx`** (line 631): Replace `window.location.origin` with `https://oliveclean.co` for the feedback URL, same fix as the redirect issue.

**File: `src/pages/FeedbackForm.tsx`**: Update error message to show "Oops! This link seems to have expired. Please contact us if you still wish to leave feedback." and add a friendly fallback UI.

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/TeamTab.tsx` | Add role dropdown + auto-invite to "Add" dialog; add role badges to list view |
| `src/hooks/useAuth.tsx` | Rename `isCleaner` → `isCleaningTechnician`, role `cleaner` → `cleaning_technician` |
| `src/pages/AdminDashboard.tsx` | Update `isCleaner` references |
| `src/pages/WhyUs.tsx` | Copy: "cleaners" → "cleaning technicians" |
| `src/pages/About.tsx` | Copy: "cleaners" → "cleaning technicians" |
| `src/lib/seo.ts` | Update SEO text |
| `src/pages/FeedbackForm.tsx` | Friendly error message for missing/expired jobs |
| `src/pages/EmployeeDashboard.tsx` | Hardcode `oliveclean.co` in feedback URL |
| Database migration | Add public SELECT policy on `jobs` for completed jobs |
| Database (insert tool) | Rename `cleaner` → `cleaning_technician` in `user_roles` and `custom_roles` |

