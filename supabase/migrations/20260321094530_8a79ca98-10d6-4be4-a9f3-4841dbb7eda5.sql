ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS job_posting_id uuid REFERENCES public.job_postings(id) ON DELETE SET NULL;