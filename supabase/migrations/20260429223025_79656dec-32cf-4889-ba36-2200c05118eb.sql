ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS converted_job_id uuid;

UPDATE public.jobs
SET source = 'quote'
WHERE source = 'manual'
  AND (notes ILIKE 'Auto-created from%quote%' OR notes ILIKE 'Converted from%' OR notes ILIKE 'From quote%');

CREATE INDEX IF NOT EXISTS idx_jobs_source ON public.jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled_at ON public.jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_estimates_converted_job_id ON public.estimates(converted_job_id);