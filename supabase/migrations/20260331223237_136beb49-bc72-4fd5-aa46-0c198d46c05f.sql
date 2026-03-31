
-- 1. New table: loyalty_programs
CREATE TABLE public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  benefits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access loyalty_programs" ON public.loyalty_programs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read active programs" ON public.loyalty_programs FOR SELECT TO authenticated
  USING (is_active = true);

-- 2. Extend perks_members
ALTER TABLE public.perks_members
  ADD COLUMN program_type TEXT NOT NULL DEFAULT 'loyalty_club',
  ADD COLUMN cleanings_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN free_cleanings_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN free_cleanings_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN referral_code TEXT UNIQUE,
  ADD COLUMN referred_by UUID REFERENCES public.perks_members(id);

-- Add client read policy for perks_members (so clients can see their own membership)
CREATE POLICY "Clients can view own perks membership" ON public.perks_members FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE client_user_id = auth.uid()));

-- 3. New table: loyalty_milestones
CREATE TABLE public.loyalty_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.perks_members(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed BOOLEAN NOT NULL DEFAULT false,
  job_id UUID,
  notes TEXT
);

ALTER TABLE public.loyalty_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access loyalty_milestones" ON public.loyalty_milestones FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view own milestones" ON public.loyalty_milestones FOR SELECT TO authenticated
  USING (member_id IN (
    SELECT pm.id FROM public.perks_members pm
    JOIN public.clients c ON c.id = pm.client_id
    WHERE c.client_user_id = auth.uid()
  ));

-- 4. Seed default programs
INSERT INTO public.loyalty_programs (name, discount_percent, description, benefits) VALUES
  ('Loyalty Club', 40, 'Our signature perks club with extreme discounts and milestone rewards.', '{"free_cleaning_interval": 10, "referral_reward": true, "six_month_dusting": true}'),
  ('Friends & Family', 25, 'Special program for friends and family of our team.', '{"free_cleaning_interval": 15, "referral_reward": true, "six_month_dusting": false}'),
  ('Veterans', 30, 'Honoring those who served with special cleaning discounts.', '{"free_cleaning_interval": 12, "referral_reward": true, "six_month_dusting": true}'),
  ('Retired', 20, 'Special rates for retired clients who deserve extra care.', '{"free_cleaning_interval": 15, "referral_reward": false, "six_month_dusting": true}');
