ALTER TABLE public.role_permissions ADD COLUMN can_edit boolean NOT NULL DEFAULT false;

UPDATE public.role_permissions SET can_edit = true WHERE role = 'admin';