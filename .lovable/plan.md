

# Job Attachments System — Photos Visible to Admin

## Overview
Currently, employees and clients upload photos directly to `before_photos` and `after_photos` storage buckets with no metadata tracking. Admins have no way to see these photos. This plan adds a `job_attachments` table, wires up existing upload flows to record metadata, builds a photo gallery in the Admin job detail panel, and adds a "Recent Uploads" feed.

## Database

### New table: `job_attachments`
```sql
CREATE TABLE public.job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  uploader_id UUID NOT NULL,
  uploader_role TEXT NOT NULL DEFAULT 'staff',   -- 'staff', 'client'
  file_path TEXT NOT NULL,
  bucket TEXT NOT NULL,                          -- 'before_photos', 'after_photos'
  category TEXT NOT NULL DEFAULT 'other',        -- 'before', 'after', 'issue'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
- **Admin full access** (ALL) — `has_role(auth.uid(), 'admin')`
- **Staff can insert own** (INSERT) — `uploader_id = auth.uid()`
- **Staff can view job attachments** (SELECT) — `has_role(auth.uid(), 'staff')`
- **Clients can insert own** (INSERT) — `uploader_id = auth.uid()`
- **Clients can view own job attachments** (SELECT) — job_id in client's jobs

## Code Changes

### 1. `src/pages/EmployeeDashboard.tsx` — Update `uploadPhoto`
After successful storage upload, insert a row into `job_attachments` with:
- `job_id`, `uploader_id` (from auth), `uploader_role: 'staff'`
- `bucket` name, `file_path`, `category` derived from bucket (`before_photos` → `'before'`, `after_photos` → `'after'`)

### 2. `src/pages/FeedbackForm.tsx` — Update photo upload loop
After each successful storage upload, insert into `job_attachments` with `uploader_role: 'client'`, `category: 'after'`.

### 3. New: `src/components/admin/JobPhotosGallery.tsx`
- Accepts `jobId` prop
- Queries `job_attachments` for that job, ordered by `created_at`
- For each attachment, builds the public URL from `bucket` + `file_path`
- Renders a grid of thumbnails grouped by category (Before / After)
- Shows uploader role and timestamp
- Clicking a thumbnail opens a lightbox (dialog with full-size image)

### 4. `src/components/admin/JobsTab.tsx` — Integrate gallery
Add a "Photos" section in `JobDetailPanel` (after Notes, before Log Duration) that renders `<JobPhotosGallery jobId={job.id} />`.

### 5. New: `src/components/admin/RecentUploads.tsx`
- Queries latest 20 `job_attachments` joined with jobs/clients
- Shows thumbnail grid with job link, timestamp, uploader info
- Integrate into `AdminDashboard.tsx` as a new tab or a section within the Analytics tab

## Files Modified / Created
| File | Action |
|---|---|
| `migration: create_job_attachments` | New — table + RLS |
| `src/pages/EmployeeDashboard.tsx` | Edit — insert attachment record on upload |
| `src/pages/FeedbackForm.tsx` | Edit — insert attachment record on upload |
| `src/components/admin/JobPhotosGallery.tsx` | New — photo gallery component |
| `src/components/admin/RecentUploads.tsx` | New — recent uploads feed |
| `src/components/admin/JobsTab.tsx` | Edit — embed gallery in detail panel |
| `src/pages/AdminDashboard.tsx` | Edit — add Recent Uploads section |

