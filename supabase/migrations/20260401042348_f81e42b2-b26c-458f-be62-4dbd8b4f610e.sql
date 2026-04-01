
-- 1. Trigger: notify admins on new supply request
CREATE OR REPLACE FUNCTION public.notify_admin_on_supply_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_uid uuid;
  emp_name text;
  item_name text;
BEGIN
  SELECT e.name INTO emp_name FROM employees e WHERE e.id = NEW.employee_id;
  SELECT si.name INTO item_name FROM supply_items si WHERE si.id = NEW.supply_item_id;

  FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      admin_uid,
      'supply_request',
      COALESCE(emp_name, 'Staff') || ' requested ' || COALESCE(item_name, 'item') || ' × ' || NEW.quantity,
      COALESCE(NEW.notes, ''),
      jsonb_build_object('supply_request_id', NEW.id, 'employee_id', NEW.employee_id, 'supply_item_id', NEW.supply_item_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_supply_request
AFTER INSERT ON public.supply_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_supply_request();

-- 2. Trigger: notify admins when a reward is redeemed
CREATE OR REPLACE FUNCTION public.notify_admin_on_reward_redeemed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_uid uuid;
  client_name text;
BEGIN
  IF OLD.redeemed = false AND NEW.redeemed = true THEN
    SELECT c.name INTO client_name
    FROM perks_members pm JOIN clients c ON c.id = pm.client_id
    WHERE pm.id = NEW.member_id;

    FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES (
        admin_uid,
        'reward_redeemed',
        'Reward redeemed: ' || replace(NEW.milestone_type, '_', ' '),
        COALESCE(client_name, 'Client') || ' redeemed their ' || replace(NEW.milestone_type, '_', ' '),
        jsonb_build_object('milestone_id', NEW.id, 'member_id', NEW.member_id, 'milestone_type', NEW.milestone_type)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_reward_redeemed
AFTER UPDATE OF redeemed ON public.loyalty_milestones
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_reward_redeemed();

-- 3. Trigger: notify admins when stock drops below threshold
CREATE OR REPLACE FUNCTION public.notify_admin_on_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_uid uuid;
BEGIN
  IF NEW.current_stock <= NEW.reorder_threshold
     AND (OLD.current_stock > OLD.reorder_threshold OR OLD.current_stock IS NULL) THEN
    FOR admin_uid IN SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES (
        admin_uid,
        'low_stock',
        NEW.name || ' is low (' || NEW.current_stock || ' remaining)',
        'Stock fell below reorder threshold of ' || NEW.reorder_threshold,
        jsonb_build_object('supply_item_id', NEW.id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_stock
AFTER UPDATE OF current_stock ON public.supply_items
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_low_stock();

-- 4. Enable realtime on loyalty_milestones
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_milestones;
