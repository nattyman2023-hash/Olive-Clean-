CREATE POLICY "Public can view completed jobs for feedback"
ON public.jobs FOR SELECT TO public
USING (status = 'completed');