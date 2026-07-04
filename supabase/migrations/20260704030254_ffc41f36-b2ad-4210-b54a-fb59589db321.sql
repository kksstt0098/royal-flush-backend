
-- Revoke EXECUTE from PUBLIC and anon on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.mock_deposit(numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_withdrawal(numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.staff_display_name(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.risk_control_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lock_withdrawal(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_mail(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_credit_player(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_player(uuid, numeric, text) FROM PUBLIC, anon;

-- Grant EXECUTE to authenticated only for functions actually called by signed-in users
GRANT EXECUTE ON FUNCTION public.mock_deposit(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_display_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.risk_control_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_withdrawal(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_mail(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_player(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_player(uuid, numeric, text) TO authenticated;

-- Restrict promo-banners bucket reads to admins only (public display uses signed URLs which bypass RLS)
DROP POLICY IF EXISTS "Promo banners read" ON storage.objects;
CREATE POLICY "Promo banners admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'));
