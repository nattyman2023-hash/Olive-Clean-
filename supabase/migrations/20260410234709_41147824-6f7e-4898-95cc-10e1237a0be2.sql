-- Add new columns for scheduling, tracking, and approval
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_token text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Unique index on approval_token (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_estimates_approval_token ON public.estimates (approval_token) WHERE approval_token IS NOT NULL;

-- Allow public/anon to SELECT a single estimate by approval_token (for the public quote page)
CREATE POLICY "Public can view estimate by token"
  ON public.estimates
  FOR SELECT
  TO public
  USING (approval_token IS NOT NULL AND approval_token = current_setting('request.headers', true)::json->>'x-approval-token');

-- Staff can view estimates
CREATE POLICY "Staff can view estimates"
  ON public.estimates
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'staff'));

-- Staff can manage estimates
CREATE POLICY "Staff can manage estimates"
  ON public.estimates
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'staff'));