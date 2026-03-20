
-- Supply items table
CREATE TABLE public.supply_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'cleaning_supply',
  current_stock numeric NOT NULL DEFAULT 0,
  reorder_threshold numeric NOT NULL DEFAULT 5,
  unit text NOT NULL DEFAULT 'units',
  last_restocked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supply_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access supply_items" ON public.supply_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view supply_items" ON public.supply_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- Supply usage logs table
CREATE TABLE public.supply_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_item_id uuid NOT NULL REFERENCES public.supply_items(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  quantity_used numeric NOT NULL DEFAULT 1,
  logged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supply_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access supply_usage_logs" ON public.supply_usage_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can insert usage logs" ON public.supply_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can view usage logs" ON public.supply_usage_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));
