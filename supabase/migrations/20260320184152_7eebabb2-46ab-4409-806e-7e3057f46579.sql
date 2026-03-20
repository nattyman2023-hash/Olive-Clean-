
-- employees table
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'onboarding',
  certifications jsonb DEFAULT '[]'::jsonb,
  onboarding_checklist jsonb DEFAULT '{"documentation":false,"training":false,"policy_agreement":false,"supplies_issued":false}'::jsonb,
  hired_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage employees" ON public.employees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own employee record" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- employee_performance table
CREATE TABLE public.employee_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month date NOT NULL,
  jobs_completed integer DEFAULT 0,
  recleans integer DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  avg_efficiency_pct numeric DEFAULT 0,
  attendance_score numeric DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month)
);
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage performance" ON public.employee_performance FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own performance" ON public.employee_performance FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
