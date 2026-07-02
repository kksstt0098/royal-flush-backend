
-- wallets: block all direct client writes (mutations only via SECURITY DEFINER fns / service_role)
CREATE POLICY "no client insert" ON public.wallets FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "no client update" ON public.wallets FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "no client delete" ON public.wallets FOR DELETE TO authenticated, anon USING (false);

-- user_roles: only admins may grant/revoke roles (and only via functions, but keep policy as belt-and-suspenders)
CREATE POLICY "admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs: no client-side writes ever
CREATE POLICY "no client insert audit" ON public.audit_logs FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "no client update audit" ON public.audit_logs FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "no client delete audit" ON public.audit_logs FOR DELETE TO authenticated, anon USING (false);

-- withdrawals: status/lock changes only via functions, never direct client writes
CREATE POLICY "no client update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "no client delete withdrawals" ON public.withdrawals FOR DELETE TO authenticated, anon USING (false);

-- Revoke EXECUTE from authenticated on internal helper SECURITY DEFINER functions.
-- These are called only by other server-side functions or triggers, never directly by clients.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.staff_display_name(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated, anon, public;

-- Ensure these remain callable inside other SECURITY DEFINER functions (owner already has access).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.staff_display_name(uuid) TO service_role;
