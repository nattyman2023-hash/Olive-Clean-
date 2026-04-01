
-- 1. Create shift_trade_requests table
CREATE TABLE public.shift_trade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requester_job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  target_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  target_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_trade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access shift_trade_requests"
ON public.shift_trade_requests
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can insert own trade requests"
ON public.shift_trade_requests
FOR INSERT TO authenticated
WITH CHECK (
  requester_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
);

CREATE POLICY "Staff can view relevant trade requests"
ON public.shift_trade_requests
FOR SELECT TO authenticated
USING (
  requester_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
  OR target_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
  OR (target_id IS NULL AND status = 'open')
);

CREATE POLICY "Staff can update relevant trade requests"
ON public.shift_trade_requests
FOR UPDATE TO authenticated
USING (
  requester_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
  OR target_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
)
WITH CHECK (
  requester_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
  OR target_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
);

-- 2. Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can insert notifications for anyone"
ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 3. Enable realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
