
-- =====================================================
-- STEP 1: Drop ALL policies that depend on has_role(uuid, app_role)
-- =====================================================

-- user_roles
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin full access user_roles" ON public.user_roles;

-- booking_requests
DROP POLICY IF EXISTS "Staff can view booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Admins can update booking requests" ON public.booking_requests;

-- clients
DROP POLICY IF EXISTS "Admin and staff can view clients" ON public.clients;
DROP POLICY IF EXISTS "Admin and staff can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admin and staff can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admin can delete clients" ON public.clients;

-- jobs
DROP POLICY IF EXISTS "Admin and staff can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admin and staff can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admin and staff can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admin can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Finance can view jobs" ON public.jobs;

-- perks_members
DROP POLICY IF EXISTS "Admin can view perks members" ON public.perks_members;
DROP POLICY IF EXISTS "Admin can insert perks members" ON public.perks_members;
DROP POLICY IF EXISTS "Admin can update perks members" ON public.perks_members;

-- feedback
DROP POLICY IF EXISTS "Admin and staff can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admin and staff can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admin and staff can update feedback" ON public.feedback;

-- perks_offers
DROP POLICY IF EXISTS "Admin can view perks offers" ON public.perks_offers;
DROP POLICY IF EXISTS "Admin can insert perks offers" ON public.perks_offers;
DROP POLICY IF EXISTS "Admin can update perks offers" ON public.perks_offers;

-- employees
DROP POLICY IF EXISTS "Admin can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admin can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Finance can view employees" ON public.employees;

-- employee_performance
DROP POLICY IF EXISTS "Admin can manage performance" ON public.employee_performance;

-- applicants
DROP POLICY IF EXISTS "Admin can manage applicants" ON public.applicants;
DROP POLICY IF EXISTS "Staff can view applicants" ON public.applicants;

-- lifecycle_events
DROP POLICY IF EXISTS "Admin can manage lifecycle events" ON public.lifecycle_events;

-- supply_items
DROP POLICY IF EXISTS "Admin full access supply_items" ON public.supply_items;
DROP POLICY IF EXISTS "Staff can view supply_items" ON public.supply_items;

-- supply_usage_logs
DROP POLICY IF EXISTS "Admin full access supply_usage_logs" ON public.supply_usage_logs;
DROP POLICY IF EXISTS "Staff can insert usage logs" ON public.supply_usage_logs;
DROP POLICY IF EXISTS "Staff can view usage logs" ON public.supply_usage_logs;

-- job_postings
DROP POLICY IF EXISTS "Admin full access job_postings" ON public.job_postings;

-- invoices
DROP POLICY IF EXISTS "Admin full access invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance can view invoices" ON public.invoices;

-- estimates
DROP POLICY IF EXISTS "Admin full access estimates" ON public.estimates;

-- payslips
DROP POLICY IF EXISTS "Admin full access payslips" ON public.payslips;
DROP POLICY IF EXISTS "Finance can view payslips" ON public.payslips;

-- expenses
DROP POLICY IF EXISTS "Admin full access expenses" ON public.expenses;
DROP POLICY IF EXISTS "Finance can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Finance can update expenses" ON public.expenses;

-- employee_availability
DROP POLICY IF EXISTS "Admin full access to availability" ON public.employee_availability;

-- time_off_requests
DROP POLICY IF EXISTS "Admin full access to time_off" ON public.time_off_requests;

-- job_attachments
DROP POLICY IF EXISTS "Admin full access job_attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Staff can insert own attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Staff can view job attachments" ON public.job_attachments;

-- loyalty_programs
DROP POLICY IF EXISTS "Admin full access loyalty_programs" ON public.loyalty_programs;

-- loyalty_milestones
DROP POLICY IF EXISTS "Admin full access loyalty_milestones" ON public.loyalty_milestones;

-- team_messages
DROP POLICY IF EXISTS "Admin can manage team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Staff can view team messages" ON public.team_messages;

-- supply_requests
DROP POLICY IF EXISTS "Admin full access supply_requests" ON public.supply_requests;

-- shift_trade_requests
DROP POLICY IF EXISTS "Admin full access shift_trade_requests" ON public.shift_trade_requests;

-- notifications
DROP POLICY IF EXISTS "Admin can insert notifications for anyone" ON public.notifications;

-- service_templates
DROP POLICY IF EXISTS "Admin full access service_templates" ON public.service_templates;
DROP POLICY IF EXISTS "Staff can view service_templates" ON public.service_templates;

-- leads
DROP POLICY IF EXISTS "Admin full access leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can view leads" ON public.leads;

-- job_time_logs
DROP POLICY IF EXISTS "Staff can insert own time logs" ON public.job_time_logs;
DROP POLICY IF EXISTS "Admin full access time logs" ON public.job_time_logs;
DROP POLICY IF EXISTS "Finance can view job_time_logs" ON public.job_time_logs;

-- payout_records
DROP POLICY IF EXISTS "Admin full access payout_records" ON public.payout_records;
DROP POLICY IF EXISTS "Finance full access payout_records" ON public.payout_records;

-- role_permissions
DROP POLICY IF EXISTS "Admin full access role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view own role permissions" ON public.role_permissions;

-- storage policies
DROP POLICY IF EXISTS "Admin and staff can read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload employee photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload own photo" ON storage.objects;

-- =====================================================
-- STEP 2: Drop the old function and convert columns
-- =====================================================
DROP FUNCTION public.has_role(uuid, public.app_role);

ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE text USING role::text;

-- =====================================================
-- STEP 3: Create new has_role function with text param
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================================================
-- STEP 4: Recreate ALL policies (using text literals)
-- =====================================================

-- user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- booking_requests
CREATE POLICY "Staff can view booking requests" ON public.booking_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admins can update booking requests" ON public.booking_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- clients
CREATE POLICY "Admin and staff can view clients" ON public.clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin and staff can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin and staff can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin can delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- jobs
CREATE POLICY "Admin and staff can view jobs" ON public.jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin and staff can insert jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin and staff can update jobs" ON public.jobs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin can delete jobs" ON public.jobs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can view jobs" ON public.jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

-- perks_members
CREATE POLICY "Admin can view perks members" ON public.perks_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert perks members" ON public.perks_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update perks members" ON public.perks_members FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- feedback
CREATE POLICY "Admin and staff can view feedback" ON public.feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin and staff can insert feedback" ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admin and staff can update feedback" ON public.feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- perks_offers
CREATE POLICY "Admin can view perks offers" ON public.perks_offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert perks offers" ON public.perks_offers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update perks offers" ON public.perks_offers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- employees
CREATE POLICY "Admin can manage employees" ON public.employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete employees" ON public.employees FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can view employees" ON public.employees FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

-- employee_performance
CREATE POLICY "Admin can manage performance" ON public.employee_performance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- applicants
CREATE POLICY "Admin can manage applicants" ON public.applicants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view applicants" ON public.applicants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- lifecycle_events
CREATE POLICY "Admin can manage lifecycle events" ON public.lifecycle_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- supply_items
CREATE POLICY "Admin full access supply_items" ON public.supply_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view supply_items" ON public.supply_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- supply_usage_logs
CREATE POLICY "Admin full access supply_usage_logs" ON public.supply_usage_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can insert usage logs" ON public.supply_usage_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can view usage logs" ON public.supply_usage_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- job_postings
CREATE POLICY "Admin full access job_postings" ON public.job_postings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- invoices
CREATE POLICY "Admin full access invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

-- estimates
CREATE POLICY "Admin full access estimates" ON public.estimates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- payslips
CREATE POLICY "Admin full access payslips" ON public.payslips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can view payslips" ON public.payslips FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

-- expenses
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can view expenses" ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'finance'))
  WITH CHECK (public.has_role(auth.uid(), 'finance'));

-- employee_availability
CREATE POLICY "Admin full access to availability" ON public.employee_availability FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- time_off_requests
CREATE POLICY "Admin full access to time_off" ON public.time_off_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- job_attachments
CREATE POLICY "Admin full access job_attachments" ON public.job_attachments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can insert own attachments" ON public.job_attachments FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid() AND public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can view job attachments" ON public.job_attachments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- loyalty_programs
CREATE POLICY "Admin full access loyalty_programs" ON public.loyalty_programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- loyalty_milestones
CREATE POLICY "Admin full access loyalty_milestones" ON public.loyalty_milestones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- team_messages
CREATE POLICY "Admin can manage team messages" ON public.team_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view team messages" ON public.team_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- supply_requests
CREATE POLICY "Admin full access supply_requests" ON public.supply_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- shift_trade_requests
CREATE POLICY "Admin full access shift_trade_requests" ON public.shift_trade_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- notifications
CREATE POLICY "Admin can insert notifications for anyone" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- service_templates
CREATE POLICY "Admin full access service_templates" ON public.service_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view service_templates" ON public.service_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- leads
CREATE POLICY "Admin full access leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view leads" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- job_time_logs
CREATE POLICY "Admin full access time logs" ON public.job_time_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can insert own time logs" ON public.job_time_logs FOR INSERT TO authenticated
  WITH CHECK (employee_user_id = auth.uid() AND public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Finance can view job_time_logs" ON public.job_time_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finance'));

-- payout_records
CREATE POLICY "Admin full access payout_records" ON public.payout_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance full access payout_records" ON public.payout_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'finance'))
  WITH CHECK (public.has_role(auth.uid(), 'finance'));

-- role_permissions
CREATE POLICY "Admin full access role_permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role permissions" ON public.role_permissions FOR SELECT TO authenticated
  USING (role IN (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- storage policies
CREATE POLICY "Admin and staff can read resumes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY "Admin can upload employee photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee_photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can upload own photo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee_photos' AND public.has_role(auth.uid(), 'staff'));

-- =====================================================
-- STEP 5: Create custom_roles table and seed
-- =====================================================
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access custom_roles" ON public.custom_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view custom_roles" ON public.custom_roles FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.custom_roles (name, description) VALUES
  ('staff', 'Basic team member access'),
  ('finance', 'Access to financial records and payroll'),
  ('admin_assistant', 'Limited admin access based on configured permissions'),
  ('cleaner', 'Cleaning technician with field access');

-- =====================================================
-- STEP 6: Update trigger functions that reference enum casts
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_reward_redeemed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_uid uuid; client_name text;
BEGIN
  IF OLD.redeemed = false AND NEW.redeemed = true THEN
    SELECT c.name INTO client_name FROM perks_members pm JOIN clients c ON c.id = pm.client_id WHERE pm.id = NEW.member_id;
    FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin' LOOP
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES (admin_uid, 'reward_redeemed', 'Reward redeemed: ' || replace(NEW.milestone_type, '_', ' '),
        COALESCE(client_name, 'Client') || ' redeemed their ' || replace(NEW.milestone_type, '_', ' '),
        jsonb_build_object('milestone_id', NEW.id, 'member_id', NEW.member_id, 'milestone_type', NEW.milestone_type));
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admin_on_supply_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_uid uuid; emp_name text; item_name text;
BEGIN
  SELECT e.name INTO emp_name FROM employees e WHERE e.id = NEW.employee_id;
  SELECT si.name INTO item_name FROM supply_items si WHERE si.id = NEW.supply_item_id;
  FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin' LOOP
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (admin_uid, 'supply_request',
      COALESCE(emp_name, 'Staff') || ' requested ' || COALESCE(item_name, 'item') || ' × ' || NEW.quantity,
      COALESCE(NEW.notes, ''),
      jsonb_build_object('supply_request_id', NEW.id, 'employee_id', NEW.employee_id, 'supply_item_id', NEW.supply_item_id));
  END LOOP;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admin_on_low_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_uid uuid;
BEGIN
  IF NEW.current_stock <= NEW.reorder_threshold AND (OLD.current_stock > OLD.reorder_threshold OR OLD.current_stock IS NULL) THEN
    FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin' LOOP
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES (admin_uid, 'low_stock', NEW.name || ' is low (' || NEW.current_stock || ' remaining)',
        'Stock fell below reorder threshold of ' || NEW.reorder_threshold,
        jsonb_build_object('supply_item_id', NEW.id));
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admin_on_new_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_uid uuid;
BEGIN
  FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin' LOOP
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (admin_uid, 'new_lead', 'New lead: ' || COALESCE(NEW.name, NEW.email, 'Unknown'),
      'Source: ' || NEW.source || CASE WHEN NEW.location IS NOT NULL THEN ' • ' || NEW.location ELSE '' END,
      jsonb_build_object('lead_id', NEW.id, 'score', NEW.score));
  END LOOP;
  RETURN NEW;
END; $$;
