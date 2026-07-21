
ALTER TABLE public.admin_meta ADD COLUMN IF NOT EXISTS active_session_id uuid;

CREATE OR REPLACE FUNCTION public.claim_admin_session(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.admin_meta(id, active_session_id, status)
    VALUES (auth.uid(), _session_id, 'offline')
    ON CONFLICT (id) DO UPDATE SET active_session_id = EXCLUDED.active_session_id;
END $$;

CREATE OR REPLACE FUNCTION public.is_active_admin_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_meta
    WHERE id = auth.uid() AND active_session_id = _session_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.claim_admin_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_session(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_admin_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin_session(uuid) TO authenticated;
