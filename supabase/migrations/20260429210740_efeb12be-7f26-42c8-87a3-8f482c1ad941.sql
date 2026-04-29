-- Structured address fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text;

-- Quote rejection + accept-source tracking
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS accepted_via text DEFAULT 'customer';

-- Job cancellation context
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Data fix: any legacy 'complete' becomes 'completed'
UPDATE public.jobs SET status = 'completed' WHERE status = 'complete';