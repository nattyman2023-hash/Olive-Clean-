
CREATE TABLE public.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  author_id UUID,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'note',
  is_task BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access crm_notes"
  ON public.crm_notes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view crm_notes"
  ON public.crm_notes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert crm_notes"
  ON public.crm_notes FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'staff'));

CREATE POLICY "Service role can insert crm_notes"
  ON public.crm_notes FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_crm_notes_parent ON public.crm_notes (parent_type, parent_id);
CREATE INDEX idx_crm_notes_tasks ON public.crm_notes (is_task, is_completed) WHERE is_task = true;
