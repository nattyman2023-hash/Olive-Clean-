
CREATE TABLE public.job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  uploader_id UUID NOT NULL,
  uploader_role TEXT NOT NULL DEFAULT 'staff',
  file_path TEXT NOT NULL,
  bucket TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access job_attachments"
ON public.job_attachments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Staff can insert own uploads
CREATE POLICY "Staff can insert own attachments"
ON public.job_attachments FOR INSERT TO authenticated
WITH CHECK (uploader_id = auth.uid() AND public.has_role(auth.uid(), 'staff'));

-- Staff can view all job attachments
CREATE POLICY "Staff can view job attachments"
ON public.job_attachments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

-- Anyone can insert (for unauthenticated feedback form uploads)
CREATE POLICY "Public can insert attachments"
ON public.job_attachments FOR INSERT TO public
WITH CHECK (true);

-- Clients can view attachments for their own jobs
CREATE POLICY "Clients can view own job attachments"
ON public.job_attachments FOR SELECT TO authenticated
USING (
  job_id IN (
    SELECT j.id FROM public.jobs j
    WHERE j.client_id IN (
      SELECT c.id FROM public.clients c WHERE c.client_user_id = auth.uid()
    )
  )
);
