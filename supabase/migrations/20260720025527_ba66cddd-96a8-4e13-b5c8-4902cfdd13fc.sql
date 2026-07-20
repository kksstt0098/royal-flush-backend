
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.admin_user_status AS ENUM ('offline','online','frozen','disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- admin_meta: per-admin profile & moderation state
CREATE TABLE IF NOT EXISTS public.admin_meta (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  status public.admin_user_status NOT NULL DEFAULT 'offline',
  freeze_reason text,
  disable_reason text,
  deleted_at timestamptz,
  deleted_by uuid,
  deleted_by_name text,
  deleted_reason text,
  created_by uuid,
  created_by_name text NOT NULL DEFAULT 'system',
  updated_by uuid,
  updated_by_name text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_meta_status_idx ON public.admin_meta(status);
CREATE INDEX IF NOT EXISTS admin_meta_deleted_at_idx ON public.admin_meta(deleted_at);

GRANT SELECT ON public.admin_meta TO authenticated;
GRANT ALL ON public.admin_meta TO service_role;
ALTER TABLE public.admin_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read admin_meta" ON public.admin_meta;
CREATE POLICY "admins read admin_meta" ON public.admin_meta
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_admin_meta_updated_at ON public.admin_meta;
CREATE TRIGGER trg_admin_meta_updated_at BEFORE UPDATE ON public.admin_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- admin_activity_logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  actor_name text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  target_id uuid,
  target_name text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_logs_created_idx ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_logs_target_idx ON public.admin_activity_logs(target_id);

GRANT SELECT ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read admin_activity_logs" ON public.admin_activity_logs;
CREATE POLICY "admins read admin_activity_logs" ON public.admin_activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Backfill admin_meta rows for existing staff so they show up in the list
INSERT INTO public.admin_meta (id, full_name, status, created_by_name, updated_by_name)
SELECT DISTINCT ur.user_id,
       COALESCE(p.nick,''),
       'offline'::public.admin_user_status,
       'system','system'
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role IN ('admin','auditor','payer')
ON CONFLICT (id) DO NOTHING;
