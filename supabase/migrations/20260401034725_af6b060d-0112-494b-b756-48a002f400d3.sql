-- Allow admins to delete jobs
CREATE POLICY "Admin can delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));