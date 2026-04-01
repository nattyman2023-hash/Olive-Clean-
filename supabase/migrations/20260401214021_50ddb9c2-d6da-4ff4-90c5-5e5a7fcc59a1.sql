
-- Create leads table for CRM
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  email text,
  phone text,
  location text,
  bedrooms integer,
  bathrooms integer,
  frequency text,
  urgency text,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'chatbot',
  chat_transcript jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  converted_job_id uuid
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access leads"
ON public.leads FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Staff can view leads
CREATE POLICY "Staff can view leads"
ON public.leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

-- Public can insert leads (from chatbot widget)
CREATE POLICY "Public can insert leads"
ON public.leads FOR INSERT
TO public
WITH CHECK (true);

-- Trigger: notify admins on new lead
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_uid uuid;
BEGIN
  FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      admin_uid,
      'new_lead',
      'New lead: ' || COALESCE(NEW.name, NEW.email, 'Unknown'),
      'Source: ' || NEW.source || CASE WHEN NEW.location IS NOT NULL THEN ' • ' || NEW.location ELSE '' END,
      jsonb_build_object('lead_id', NEW.id, 'score', NEW.score)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_lead();

-- Enable realtime on leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
