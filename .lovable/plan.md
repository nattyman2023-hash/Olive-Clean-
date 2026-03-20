

# Phase 2: Employee Portal + Client-Facing Portal

## Database Migrations

### Migration 1: Employee tables
```sql
-- employees table
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'onboarding',
  certifications jsonb DEFAULT '[]'::jsonb,
  onboarding_checklist jsonb DEFAULT '{"documentation":false,"training":false,"policy_agreement":false,"supplies_issued":false}'::jsonb,
  hired_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS: admin full CRUD, staff can view own
CREATE POLICY "Admin can manage employees" ON public.employees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own employee record" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- employee_performance table (monthly KPI snapshots)
CREATE TABLE public.employee_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month date NOT NULL,
  jobs_completed integer DEFAULT 0,
  recleans integer DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  avg_efficiency_pct numeric DEFAULT 0,
  attendance_score numeric DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month)
);
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage performance" ON public.employee_performance FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own performance" ON public.employee_performance FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
```

### Migration 2: Client portal support
```sql
-- Add client role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Add client_user_id to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_user_id uuid;

-- RLS: clients can view their own record
CREATE POLICY "Clients can view own record" ON public.clients FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());
CREATE POLICY "Clients can update own preferences" ON public.clients FOR UPDATE TO authenticated
  USING (client_user_id = auth.uid()) WITH CHECK (client_user_id = auth.uid());

-- Clients can view their own jobs
CREATE POLICY "Clients can view own jobs" ON public.jobs FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE client_user_id = auth.uid()));

-- Clients can view their own feedback
CREATE POLICY "Clients can view own feedback" ON public.feedback FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE client_user_id = auth.uid()));
```

## New Files

### `src/components/admin/TeamTab.tsx`
Admin-only tab with:
- Employee list with status badges (onboarding/active/inactive), search/filter
- Add/edit employee form (name, phone, email, certifications, notes)
- Onboarding checklist tracker (4 checkboxes: documentation, training, policy agreement, supplies)
- Performance dashboard per employee showing KPIs from `employee_performance` table
- Ability to link employee to an auth user (for staff login)

### `src/pages/ClientLogin.tsx`
Simple email/password login form (styled like AdminLogin) with:
- Sign up flow (creates auth user, assigns `client` role)
- Login flow redirecting to `/client`
- Forgot password link

### `src/pages/ClientDashboard.tsx`
Client-facing dashboard with 3 sections:
- **Upcoming Jobs**: list of scheduled jobs for this client
- **Past Jobs**: completed jobs with feedback links
- **My Preferences**: editable key-value pairs from `clients.preferences` JSONB field (gate codes, pet names, cleaning quirks)
- Header with client name and sign-out button

## Edited Files

### `src/pages/AdminDashboard.tsx`
- Import and add "Team" tab (admin-only, alongside Perks and Analytics)

### `src/App.tsx`
- Add routes: `/client/login`, `/client`

### `src/components/Navbar.tsx`
- Add "Client Login" link to navLinks array

### `src/components/Footer.tsx`
- Add "Client Portal" link next to "Staff Login"

### `src/hooks/useAuth.tsx`
- Add `isClient` boolean that checks for the `client` role
- Expose it via context so ClientDashboard can guard access

## Technical Notes
- Client sign-up creates auth user + inserts `user_roles` row with `client` role + links `clients.client_user_id`
- The client sign-up requires an existing client record (matched by email) to link to — otherwise shows "Contact us to get started"
- Employee `onboarding_checklist` stored as JSONB for flexible checkbox tracking
- No new API keys or edge functions needed
- All new tables protected by RLS using existing `has_role()` function

