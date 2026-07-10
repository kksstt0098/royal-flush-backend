
-- 1. Fix marquee_click_logs "Anyone insert click logs" (RLS_POLICY_ALWAYS_TRUE)
DROP POLICY IF EXISTS "Anyone insert click logs" ON public.marquee_click_logs;
CREATE POLICY "Authenticated insert own click logs"
  ON public.marquee_click_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. Revoke EXECUTE on public-schema SECURITY DEFINER functions from anon/PUBLIC,
--    then grant EXECUTE to authenticated only for functions callers legitimately invoke.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon;',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Player / staff-callable RPCs (role check enforced inside function bodies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_display_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mock_deposit(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mail_mark_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marquee_increment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_player(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_player(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.risk_control_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_withdrawal(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_mail(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mail_create_campaign(
  mail_recipient_type, uuid[], uuid, text, text, jsonb,
  timestamp with time zone, timestamp with time zone
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mail_soft_delete_campaign(uuid) TO authenticated;

-- 3. Restrict profile self-updates to non-privileged columns via trigger.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admins must not change privileged/security-relevant columns.
  IF NEW.id            IS DISTINCT FROM OLD.id            THEN RAISE EXCEPTION 'Cannot change id'; END IF;
  IF NEW.vip           IS DISTINCT FROM OLD.vip           THEN RAISE EXCEPTION 'Cannot change vip'; END IF;
  IF NEW.level         IS DISTINCT FROM OLD.level         THEN RAISE EXCEPTION 'Cannot change level'; END IF;
  IF NEW.status        IS DISTINCT FROM OLD.status        THEN RAISE EXCEPTION 'Cannot change status'; END IF;
  IF NEW.remark        IS DISTINCT FROM OLD.remark        THEN RAISE EXCEPTION 'Cannot change remark'; END IF;
  IF NEW.superior_id   IS DISTINCT FROM OLD.superior_id   THEN RAISE EXCEPTION 'Cannot change superior_id'; END IF;
  IF NEW.email         IS DISTINCT FROM OLD.email         THEN RAISE EXCEPTION 'Cannot change email'; END IF;
  IF NEW.source_channel IS DISTINCT FROM OLD.source_channel THEN RAISE EXCEPTION 'Cannot change source_channel'; END IF;
  IF NEW.channel_code  IS DISTINCT FROM OLD.channel_code  THEN RAISE EXCEPTION 'Cannot change channel_code'; END IF;
  IF NEW.register_ip   IS DISTINCT FROM OLD.register_ip   THEN RAISE EXCEPTION 'Cannot change register_ip'; END IF;
  IF NEW.register_mac  IS DISTINCT FROM OLD.register_mac  THEN RAISE EXCEPTION 'Cannot change register_mac'; END IF;
  IF NEW.register_country IS DISTINCT FROM OLD.register_country THEN RAISE EXCEPTION 'Cannot change register_country'; END IF;
  IF NEW.login_ip      IS DISTINCT FROM OLD.login_ip      THEN RAISE EXCEPTION 'Cannot change login_ip'; END IF;
  IF NEW.login_country IS DISTINCT FROM OLD.login_country THEN RAISE EXCEPTION 'Cannot change login_country'; END IF;
  IF NEW.last_login    IS DISTINCT FROM OLD.last_login    THEN RAISE EXCEPTION 'Cannot change last_login'; END IF;
  IF NEW.device_type   IS DISTINCT FROM OLD.device_type   THEN RAISE EXCEPTION 'Cannot change device_type'; END IF;
  IF NEW.created_at    IS DISTINCT FROM OLD.created_at    THEN RAISE EXCEPTION 'Cannot change created_at'; END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.guard_profile_privileged_columns() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();
