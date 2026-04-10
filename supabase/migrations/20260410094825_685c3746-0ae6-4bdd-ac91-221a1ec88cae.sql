
-- Add pay type and classification to employees
ALTER TABLE public.employees
  ADD COLUMN pay_type text NOT NULL DEFAULT 'hourly',
  ADD COLUMN fixed_job_rate numeric,
  ADD COLUMN worker_classification text NOT NULL DEFAULT 'w2';

-- Add tips and pay_type to payout_records
ALTER TABLE public.payout_records
  ADD COLUMN tips numeric NOT NULL DEFAULT 0,
  ADD COLUMN pay_type text NOT NULL DEFAULT 'hourly';

-- Add tip_amount to jobs
ALTER TABLE public.jobs
  ADD COLUMN tip_amount numeric DEFAULT 0;
