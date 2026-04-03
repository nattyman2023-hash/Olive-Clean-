
CREATE TABLE public.job_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('clock_in', 'clock_out')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  is_verified_location BOOLEAN DEFAULT false,
  distance_from_site FLOAT
);

ALTER TABLE public.job_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can insert own time logs" ON public.job_time_logs
  FOR INSERT TO authenticated
  WITH CHECK (employee_user_id = auth.uid() AND public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can view own time logs" ON public.job_time_logs
  FOR SELECT TO authenticated
  USING (employee_user_id = auth.uid());

CREATE POLICY "Admin full access time logs" ON public.job_time_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
