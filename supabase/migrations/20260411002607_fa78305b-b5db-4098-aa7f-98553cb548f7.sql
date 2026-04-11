CREATE POLICY "Admin can view email_send_log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));