
CREATE TABLE public.service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  show_on_portal boolean NOT NULL DEFAULT false,
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_duration_minutes integer,
  default_price numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access service_templates"
  ON public.service_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view service_templates"
  ON public.service_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Clients can view portal services"
  ON public.service_templates FOR SELECT
  TO authenticated
  USING (show_on_portal = true AND is_active = true);

INSERT INTO public.service_templates (name, description, show_on_portal, checklist_items, default_duration_minutes, default_price) VALUES
  ('Essential Clean', 'Quick refresh — kitchens, baths, floors, and surfaces.', true, '["Clean kitchen surfaces", "Clean bathrooms", "Vacuum/mop floors", "Wipe surfaces"]'::jsonb, 90, 120),
  ('General Clean', 'Full home clean including dusting, mopping, and appliances.', true, '["Dust all surfaces", "Mop all floors", "Clean appliances", "Clean bathrooms", "Vacuum carpets"]'::jsonb, 120, 180),
  ('Signature Deep Clean', 'Baseboards, fixtures, cabinet fronts, interior windows, and more.', true, '["Dust baseboards", "Clean fixtures", "Wipe cabinet fronts", "Clean interior windows", "Deep clean bathrooms", "Deep clean kitchen"]'::jsonb, 180, 280),
  ('Makeover Deep Clean', 'Move-in/move-out level — inside ovens, fridges, closets, walls.', true, '["Clean inside oven", "Clean inside fridge", "Clean closets", "Wash walls", "Deep clean all rooms", "Clean interior windows"]'::jsonb, 240, 380);
