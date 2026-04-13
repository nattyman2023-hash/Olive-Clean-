
-- Enable extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add employee_id to feedback table
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS employee_id uuid;

-- Add feedback_email_sent to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS feedback_email_sent boolean NOT NULL DEFAULT false;
