-- 1. Add checklist_state to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS checklist_state jsonb DEFAULT '{}'::jsonb;

-- 2. Add applicant extra columns
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS years_experience integer;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS available_days jsonb;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS has_transportation boolean;

-- 3. Create job_postings table
CREATE TABLE public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT 'Nashville, TN',
  type text NOT NULL DEFAULT 'full-time',
  requirements text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access job_postings"
  ON public.job_postings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read open job_postings"
  ON public.job_postings FOR SELECT TO public
  USING (status = 'open');

-- 4. Create before_photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('before_photos', 'before_photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for before_photos
CREATE POLICY "Staff can upload before_photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'before_photos');

CREATE POLICY "Anyone can view before_photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'before_photos');