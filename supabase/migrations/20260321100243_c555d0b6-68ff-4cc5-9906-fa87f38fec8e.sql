CREATE POLICY "Admin can delete clients" ON public.clients
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete employees" ON public.employees
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));