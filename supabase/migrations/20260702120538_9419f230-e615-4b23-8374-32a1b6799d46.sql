
-- Revoke public/anon execute on all our SECURITY DEFINER functions; keep authenticated + service_role
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'has_role(uuid, public.app_role)',
    'is_staff(uuid)',
    'handle_new_user()',
    'claim_first_admin()',
    'grant_role(uuid, public.app_role)',
    'revoke_role(uuid, public.app_role)',
    'mock_deposit(numeric)',
    'create_withdrawal(numeric, text, text)',
    'staff_display_name(uuid)',
    'approve_withdrawal(uuid, text)',
    'reject_withdrawal(uuid, text)',
    'risk_control_withdrawal(uuid, text)',
    'mark_withdrawal_paid(uuid, text, text)',
    'lock_withdrawal(uuid, boolean)',
    'send_mail(uuid, text, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;
