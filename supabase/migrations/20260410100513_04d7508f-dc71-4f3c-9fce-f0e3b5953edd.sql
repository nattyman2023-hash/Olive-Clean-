
-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  section TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, section)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access role_permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read permissions for their own roles
CREATE POLICY "Users can view own role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  role IN (
    SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- Seed admin permissions (all 17 sections)
INSERT INTO public.role_permissions (role, section) VALUES
  ('admin', 'bookings'), ('admin', 'jobs'), ('admin', 'calendar'), ('admin', 'routes'),
  ('admin', 'leads'), ('admin', 'clients'), ('admin', 'perks'),
  ('admin', 'team'), ('admin', 'hiring'), ('admin', 'time-off'),
  ('admin', 'finance'), ('admin', 'analytics'), ('admin', 'services'), ('admin', 'supplies'),
  ('admin', 'emails'), ('admin', 'photos'), ('admin', 'permissions');

-- Seed staff permissions
INSERT INTO public.role_permissions (role, section) VALUES
  ('staff', 'bookings'), ('staff', 'jobs'), ('staff', 'clients');

-- Seed finance permissions
INSERT INTO public.role_permissions (role, section) VALUES
  ('finance', 'finance'), ('finance', 'analytics');
