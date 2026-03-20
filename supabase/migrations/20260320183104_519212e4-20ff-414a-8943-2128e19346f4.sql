-- Feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and staff can view feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin and staff can insert feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin and staff can update feedback" ON public.feedback
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public can read feedback" ON public.feedback
  FOR SELECT TO public
  USING (true);

-- Perks offers table
CREATE TABLE public.perks_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perks_member_id uuid NOT NULL REFERENCES public.perks_members(id) ON DELETE CASCADE,
  cancelled_job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  offered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'offered',
  responded_at timestamptz,
  new_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL
);

ALTER TABLE public.perks_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view perks offers" ON public.perks_offers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert perks offers" ON public.perks_offers
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update perks offers" ON public.perks_offers
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- After photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('after_photos', 'after_photos', true);

CREATE POLICY "Anyone can upload after photos" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'after_photos');

CREATE POLICY "Anyone can view after photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'after_photos');