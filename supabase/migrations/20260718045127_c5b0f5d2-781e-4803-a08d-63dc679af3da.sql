
-- IP whitelist table
CREATE TABLE public.ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_whitelist TO authenticated;
GRANT ALL ON public.ip_whitelist TO service_role;

ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ip_whitelist"
  ON public.ip_whitelist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins insert ip_whitelist"
  ON public.ip_whitelist FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update ip_whitelist"
  ON public.ip_whitelist FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete ip_whitelist"
  ON public.ip_whitelist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_ip_whitelist_updated_at
  BEFORE UPDATE ON public.ip_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit log of blocked attempts
CREATE TABLE public.ip_whitelist_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet,
  email text,
  allowed boolean NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.ip_whitelist_attempts TO anon, authenticated;
GRANT SELECT ON public.ip_whitelist_attempts TO authenticated;
GRANT ALL ON public.ip_whitelist_attempts TO service_role;

ALTER TABLE public.ip_whitelist_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ip attempts"
  ON public.ip_whitelist_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- SECURITY DEFINER function: check if IP is allowed.
-- If whitelist has zero active rows, denies (fail-closed).
CREATE OR REPLACE FUNCTION public.is_ip_allowed(_ip inet)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ip_whitelist
    WHERE active = true AND ip_address = _ip
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_ip_allowed(inet) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ip_allowed(inet) TO authenticated, service_role;

-- Log a blocked/allowed attempt (callable by anyone during login).
CREATE OR REPLACE FUNCTION public.log_ip_attempt(_ip inet, _email text, _allowed boolean, _ua text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.ip_whitelist_attempts(ip_address, email, allowed, user_agent)
  VALUES (_ip, _email, _allowed, _ua);
$$;

REVOKE EXECUTE ON FUNCTION public.log_ip_attempt(inet, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_ip_attempt(inet, text, boolean, text) TO anon, authenticated, service_role;

-- Seed initial admin IPs
INSERT INTO public.ip_whitelist (ip_address, label, note, created_by_name)
VALUES
  ('66.245.216.188'::inet, 'Admin Primary', 'Initial seed', 'system'),
  ('38.54.117.10'::inet, 'Admin Secondary', 'Initial seed', 'system')
ON CONFLICT (ip_address) DO NOTHING;
