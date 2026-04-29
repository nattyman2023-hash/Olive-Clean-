ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_by uuid;

CREATE POLICY "Admins and staff can record notification opens"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can view all notifications for receipts"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));