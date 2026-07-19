
CREATE TYPE public.login_status AS ENUM ('success','failed');
CREATE TYPE public.login_failure_reason AS ENUM (
  'invalid_username','invalid_password','invalid_2fa','invalid_ip',
  'account_disabled','account_locked','too_many_attempts','unknown_error'
);

CREATE TABLE public.admin_login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username text NOT NULL,
  admin_role text,
  status public.login_status NOT NULL,
  failure_reason public.login_failure_reason,
  ip_address inet,
  user_agent text,
  session_id text,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  logged_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_login_logs_time_idx ON public.admin_login_logs(logged_in_at DESC);
CREATE INDEX admin_login_logs_user_idx ON public.admin_login_logs(user_id);
CREATE INDEX admin_login_logs_status_idx ON public.admin_login_logs(status);

GRANT SELECT ON public.admin_login_logs TO authenticated;
GRANT ALL ON public.admin_login_logs TO service_role;

ALTER TABLE public.admin_login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view login logs"
  ON public.admin_login_logs FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));
