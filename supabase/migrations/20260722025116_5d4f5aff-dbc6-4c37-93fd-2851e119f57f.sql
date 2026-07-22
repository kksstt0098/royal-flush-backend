
-- 1. admin_login_logs: explicit restrictive policies denying client writes
CREATE POLICY "no_client_insert_admin_login_logs" ON public.admin_login_logs
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "no_client_update_admin_login_logs" ON public.admin_login_logs
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "no_client_delete_admin_login_logs" ON public.admin_login_logs
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- 2. mail_recipients partitions: explicit self-read policies mirroring parent
CREATE POLICY "self_read_mail_recipients_2026_07" ON public.mail_recipients_2026_07
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL AND status = 'delivered');
CREATE POLICY "staff_read_mail_recipients_2026_07" ON public.mail_recipients_2026_07
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "no_client_write_mail_recipients_2026_07" ON public.mail_recipients_2026_07
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE POLICY "self_read_mail_recipients_2026_08" ON public.mail_recipients_2026_08
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL AND status = 'delivered');
CREATE POLICY "staff_read_mail_recipients_2026_08" ON public.mail_recipients_2026_08
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "no_client_write_mail_recipients_2026_08" ON public.mail_recipients_2026_08
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE POLICY "self_read_mail_recipients_2026_09" ON public.mail_recipients_2026_09
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL AND status = 'delivered');
CREATE POLICY "staff_read_mail_recipients_2026_09" ON public.mail_recipients_2026_09
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "no_client_write_mail_recipients_2026_09" ON public.mail_recipients_2026_09
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Also update mail_ensure_partition to include these policies on future partitions
CREATE OR REPLACE FUNCTION public.mail_ensure_partition(_month date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _start date := date_trunc('month', _month)::date;
  _end   date := (date_trunc('month', _month) + interval '1 month')::date;
  _name  text := format('mail_recipients_%s', to_char(_start, 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.mail_recipients
       FOR VALUES FROM (%L) TO (%L)',
    _name, _start, _end);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _name);
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id, created_at DESC)
       WHERE status = ''delivered'' AND deleted_at IS NULL',
    _name || '_inbox_idx', _name);
  EXECUTE format(
    'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (campaign_id, user_id)',
    _name || '_uniq_idx', _name);
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON public.%I;
     CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
       USING (user_id = auth.uid() AND deleted_at IS NULL AND status = ''delivered'')',
    'self_read_' || _name, _name, 'self_read_' || _name, _name);
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON public.%I;
     CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
       USING (public.is_staff(auth.uid()))',
    'staff_read_' || _name, _name, 'staff_read_' || _name, _name);
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON public.%I;
     CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated, anon
       USING (false) WITH CHECK (false)',
    'no_client_write_' || _name, _name, 'no_client_write_' || _name, _name);
END $function$;

-- 3. profiles: explicit restrictive policy blocking client INSERT (trigger uses SECURITY DEFINER, bypasses RLS)
CREATE POLICY "no_client_insert_profiles" ON public.profiles
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
