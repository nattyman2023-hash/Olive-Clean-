
-- Add client role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Add client_user_id to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_user_id uuid;

-- RLS: clients can view their own record
CREATE POLICY "Clients can view own record" ON public.clients FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());
CREATE POLICY "Clients can update own preferences" ON public.clients FOR UPDATE TO authenticated
  USING (client_user_id = auth.uid()) WITH CHECK (client_user_id = auth.uid());

-- Clients can view their own jobs
CREATE POLICY "Clients can view own jobs" ON public.jobs FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE client_user_id = auth.uid()));

-- Clients can view their own feedback
CREATE POLICY "Clients can view own feedback" ON public.feedback FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE client_user_id = auth.uid()));
