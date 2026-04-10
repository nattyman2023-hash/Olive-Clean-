
-- Create payout_records table
CREATE TABLE public.payout_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  hours_worked numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  base_pay numeric NOT NULL DEFAULT 0,
  approved_expenses numeric NOT NULL DEFAULT 0,
  total_payout numeric NOT NULL DEFAULT 0,
  paid_at timestamp with time zone DEFAULT now(),
  paid_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access payout_records"
  ON public.payout_records FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance full access payout_records"
  ON public.payout_records FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'finance'))
  WITH CHECK (public.has_role(auth.uid(), 'finance'));

-- Finance read-only policies
CREATE POLICY "Finance can view employees"
  ON public.employees FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

CREATE POLICY "Finance can view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

CREATE POLICY "Finance can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'finance'))
  WITH CHECK (public.has_role(auth.uid(), 'finance'));

CREATE POLICY "Finance can view payslips"
  ON public.payslips FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

CREATE POLICY "Finance can view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

CREATE POLICY "Finance can view job_time_logs"
  ON public.job_time_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

CREATE POLICY "Finance can view jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));
