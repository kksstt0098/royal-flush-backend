
-- Access level enum
DO $$ BEGIN
  CREATE TYPE public.perm_access AS ENUM ('none','view','manage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================= custom_roles =================
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_by_name text DEFAULT 'system',
  updated_by uuid,
  updated_by_name text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read custom_roles" ON public.custom_roles;
CREATE POLICY "admins read custom_roles" ON public.custom_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins write custom_roles" ON public.custom_roles;
CREATE POLICY "admins write custom_roles" ON public.custom_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_custom_roles_updated_at ON public.custom_roles;
CREATE TRIGGER trg_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================= role_permissions =================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  access public.perm_access NOT NULL DEFAULT 'none',
  updated_by uuid,
  updated_by_name text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read role_permissions" ON public.role_permissions;
CREATE POLICY "admins read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins write role_permissions" ON public.role_permissions;
CREATE POLICY "admins write role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================= user_role_assignments =================
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_by_name text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_ura_user ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ura_role ON public.user_role_assignments(role_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_role_assignments TO authenticated;
GRANT ALL ON public.user_role_assignments TO service_role;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read ura" ON public.user_role_assignments;
CREATE POLICY "admins read ura" ON public.user_role_assignments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins write ura" ON public.user_role_assignments;
CREATE POLICY "admins write ura" ON public.user_role_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ================= Seed default roles =================
INSERT INTO public.custom_roles (code, name, description, is_system, created_by_name, updated_by_name)
VALUES
  ('super_admin', 'Super Admin', 'Full access to every module and action.', true, 'system', 'system'),
  ('payment', 'Payment', 'Handles deposits, withdrawals and payment operations.', true, 'system', 'system'),
  ('customer_support', 'Customer Support', 'Assists players via mail, marquee and CS tools.', true, 'system', 'system')
ON CONFLICT (code) DO NOTHING;

-- Seed permissions for defaults
DO $$
DECLARE
  super_id uuid;
  pay_id uuid;
  cs_id uuid;
  all_keys text[] := ARRAY[
    'dashboard',
    'player_query','online_players','game_records','entry_exit_records','account_logs','player_login_log',
    'withdrawal_order','review_withdrawal','withdrawal_payment',
    'online_recharge','offline_recharge','quick_recharge',
    'lobby_banner','promo_banner','ads_category','promotions',
    'mail_box','marquee','cs_configure',
    'vip_config','level_config',
    'admin_user','role_mgmt','permission_mgmt','admin_logs','whitelist','login_log'
  ];
  k text;
BEGIN
  SELECT id INTO super_id FROM public.custom_roles WHERE code='super_admin';
  SELECT id INTO pay_id   FROM public.custom_roles WHERE code='payment';
  SELECT id INTO cs_id    FROM public.custom_roles WHERE code='customer_support';

  -- Super Admin: manage everything
  FOREACH k IN ARRAY all_keys LOOP
    INSERT INTO public.role_permissions(role_id, permission_key, access)
      VALUES (super_id, k, 'manage')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
  END LOOP;

  -- Payment: manage cash/recharge, view player & dashboard, none for system
  FOREACH k IN ARRAY ARRAY[
    'withdrawal_order','review_withdrawal','withdrawal_payment',
    'online_recharge','offline_recharge','quick_recharge'
  ] LOOP
    INSERT INTO public.role_permissions(role_id, permission_key, access)
      VALUES (pay_id, k, 'manage')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY ARRAY[
    'dashboard','player_query','online_players','game_records','account_logs','player_login_log'
  ] LOOP
    INSERT INTO public.role_permissions(role_id, permission_key, access)
      VALUES (pay_id, k, 'view')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
  END LOOP;

  -- Customer Support: manage mail/marquee/cs, view player + banners
  FOREACH k IN ARRAY ARRAY['mail_box','marquee','cs_configure'] LOOP
    INSERT INTO public.role_permissions(role_id, permission_key, access)
      VALUES (cs_id, k, 'manage')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY ARRAY[
    'dashboard','player_query','online_players','account_logs','player_login_log',
    'lobby_banner','promo_banner','ads_category','promotions',
    'vip_config','level_config'
  ] LOOP
    INSERT INTO public.role_permissions(role_id, permission_key, access)
      VALUES (cs_id, k, 'view')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
  END LOOP;
END $$;
