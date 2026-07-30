
CREATE TYPE public.player_login_status AS ENUM ('success','failed','locked','logged_out');
CREATE TYPE public.player_login_method AS ENUM ('password','otp','google','apple','facebook','guest');

CREATE TABLE public.player_login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username text NOT NULL DEFAULT '',
  status public.player_login_status NOT NULL DEFAULT 'success',
  login_method public.player_login_method NOT NULL DEFAULT 'password',
  failure_reason text,
  remark text NOT NULL DEFAULT '',
  device_type text,
  device_name text,
  device_id text,
  browser text,
  os text,
  app_version text,
  ip_address text,
  country text,
  city text,
  session_id text,
  vip_level integer,
  agent text,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  logged_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX player_login_logs_time_idx ON public.player_login_logs (logged_in_at DESC);
CREATE INDEX player_login_logs_player_idx ON public.player_login_logs (player_id);

GRANT SELECT ON public.player_login_logs TO authenticated;
GRANT ALL ON public.player_login_logs TO service_role;

ALTER TABLE public.player_login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_player_login_logs" ON public.player_login_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "no_client_write_player_login_logs" ON public.player_login_logs
  AS RESTRICTIVE FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
