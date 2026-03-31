
-- 1. Allow clients to update their own jobs (cancel only, or reschedule)
CREATE OR REPLACE FUNCTION public.client_owns_job(_user_id uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.clients c ON c.id = j.client_id
    WHERE j.id = _job_id AND c.client_user_id = _user_id
  )
$$;

CREATE POLICY "Clients can update own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  client_id IN (SELECT c.id FROM clients c WHERE c.client_user_id = auth.uid())
)
WITH CHECK (
  client_id IN (SELECT c.id FROM clients c WHERE c.client_user_id = auth.uid())
);

-- 2. Allow clients to update own loyalty milestones (redeem)
CREATE POLICY "Clients can update own milestones"
ON public.loyalty_milestones
FOR UPDATE
TO authenticated
USING (
  member_id IN (
    SELECT pm.id FROM perks_members pm
    JOIN clients c ON c.id = pm.client_id
    WHERE c.client_user_id = auth.uid()
  )
)
WITH CHECK (
  member_id IN (
    SELECT pm.id FROM perks_members pm
    JOIN clients c ON c.id = pm.client_id
    WHERE c.client_user_id = auth.uid()
  )
);

-- 3. Allow clients to insert feedback (they are authenticated)
CREATE POLICY "Clients can insert feedback"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (SELECT c.id FROM clients c WHERE c.client_user_id = auth.uid())
);

-- 4. Create team_messages table
CREATE TABLE public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage team messages"
ON public.team_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view team messages"
ON public.team_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'));

-- 5. Create supply_requests table
CREATE TABLE public.supply_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  supply_item_id uuid NOT NULL REFERENCES public.supply_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access supply_requests"
ON public.supply_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can insert own supply requests"
ON public.supply_requests
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
);

CREATE POLICY "Staff can view own supply requests"
ON public.supply_requests
FOR SELECT
TO authenticated
USING (
  employee_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
);
