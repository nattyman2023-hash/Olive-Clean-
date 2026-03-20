-- Applicants table for ATS
CREATE TABLE public.applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_url text,
  cover_note text,
  status text NOT NULL DEFAULT 'applied',
  applied_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  screening_score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- Anyone can apply (public insert)
CREATE POLICY "Anyone can submit application"
  ON public.applicants FOR INSERT TO public
  WITH CHECK (true);

-- Admin can do everything
CREATE POLICY "Admin can manage applicants"
  ON public.applicants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view
CREATE POLICY "Staff can view applicants"
  ON public.applicants FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role));

-- Resumes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Public can upload resumes
CREATE POLICY "Anyone can upload resumes"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'resumes');

-- Admin/staff can read resumes
CREATE POLICY "Admin and staff can read resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));

-- Lifecycle events table
CREATE TABLE public.lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage lifecycle events"
  ON public.lifecycle_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add lat/lng to clients for route optimization
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lng numeric;

-- Add estimated_drive_minutes to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS estimated_drive_minutes integer;