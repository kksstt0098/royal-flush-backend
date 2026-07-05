
-- User registration
CREATE OR REPLACE FUNCTION public.trg_user_registered_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.mail_enqueue_event(
    'user_registered', NEW.id, NEW.id,
    jsonb_build_object('email', NEW.email)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_mail ON auth.users;
CREATE TRIGGER on_auth_user_created_mail
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.trg_user_registered_mail();

-- Deposits (fires on status transition to Successful)
CREATE OR REPLACE FUNCTION public.trg_deposit_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Successful' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Successful') THEN
    PERFORM public.mail_enqueue_event(
      'deposit_approved', NEW.player_id, NEW.id,
      jsonb_build_object('amount', NEW.amount, 'order_no', NEW.order_no)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deposit_mail_trg ON public.deposits;
CREATE TRIGGER deposit_mail_trg
AFTER INSERT OR UPDATE OF status ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_deposit_mail();

-- Withdrawals
CREATE OR REPLACE FUNCTION public.trg_withdrawal_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Successful' AND OLD.status IS DISTINCT FROM 'Successful' THEN
    PERFORM public.mail_enqueue_event(
      'withdrawal_approved', NEW.player_id, NEW.id,
      jsonb_build_object('amount', NEW.actual_amount, 'order_no', NEW.order_no)
    );
  ELSIF NEW.status = 'Reject' AND OLD.status IS DISTINCT FROM 'Reject' THEN
    PERFORM public.mail_enqueue_event(
      'withdrawal_rejected', NEW.player_id, NEW.id,
      jsonb_build_object('order_no', NEW.order_no, 'reason', NEW.remark)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS withdrawal_mail_trg ON public.withdrawals;
CREATE TRIGGER withdrawal_mail_trg
AFTER UPDATE OF status ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.trg_withdrawal_mail();
