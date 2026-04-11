
CREATE TABLE public.payout_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  field_name text NOT NULL,
  old_value numeric NOT NULL,
  new_value numeric NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.payout_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access payout_adjustments"
  ON public.payout_adjustments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance full access payout_adjustments"
  ON public.payout_adjustments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'finance'))
  WITH CHECK (has_role(auth.uid(), 'finance'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
