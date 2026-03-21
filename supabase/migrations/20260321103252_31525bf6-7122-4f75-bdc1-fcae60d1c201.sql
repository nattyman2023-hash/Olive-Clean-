ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_url TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('employee_photos', 'employee_photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view employee photos" ON storage.objects FOR SELECT USING (bucket_id = 'employee_photos');

CREATE POLICY "Admin can upload employee photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee_photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can upload own photo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee_photos' AND public.has_role(auth.uid(), 'staff'));