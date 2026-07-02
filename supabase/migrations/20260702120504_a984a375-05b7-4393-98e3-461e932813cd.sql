
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'auditor', 'payer', 'player');
CREATE TYPE public.withdrawal_status AS ENUM ('Pending','Audited','Reject','Freeze','Paying Out','Failed','Successful');
CREATE TYPE public.lock_flag AS ENUM ('locked','unlocked');
CREATE TYPE public.player_status AS ENUM ('active','disabled');

-- ========== SHARED UPDATED_AT TRIGGER ==========
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nick text NOT NULL DEFAULT '',
  phone text,
  email text,
  vip int NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'NORMAL',
  channel_code text,
  source_channel text,
  device_type text,
  superior_id bigint DEFAULT 0,
  remark text DEFAULT '',
  status public.player_status NOT NULL DEFAULT 'active',
  register_ip text,
  register_country text,
  register_mac text,
  login_ip text,
  login_country text,
  addr text,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','auditor','payer')
  );
$$;

-- ========== WALLETS ==========
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins numeric(18,2) NOT NULL DEFAULT 0,
  safe_coins numeric(18,2) NOT NULL DEFAULT 0,
  gold_in_transfer numeric(18,2) NOT NULL DEFAULT 0,
  frozen numeric(18,2) NOT NULL DEFAULT 0,
  total_payed numeric(18,2) NOT NULL DEFAULT 0,
  total_withdrawal numeric(18,2) NOT NULL DEFAULT 0,
  total_bets numeric(18,2) NOT NULL DEFAULT 0,
  remain_bets numeric(18,2) NOT NULL DEFAULT 0,
  total_win numeric(18,2) NOT NULL DEFAULT 0,
  today_win numeric(18,2) NOT NULL DEFAULT 0,
  total_payed_times int NOT NULL DEFAULT 0,
  total_withdraw_times int NOT NULL DEFAULT 0,
  total_payout numeric(18,2) NOT NULL DEFAULT 0,
  last_payed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== WITHDRAWALS ==========
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'NORMAL',
  source_user_id text DEFAULT '',
  channel_code text DEFAULT '',
  payout_mode text NOT NULL,
  account_no text NOT NULL,
  apply_amount numeric(18,2) NOT NULL CHECK (apply_amount > 0),
  fee numeric(18,2) NOT NULL DEFAULT 0,
  actual_amount numeric(18,2) NOT NULL,
  channel text DEFAULT '',
  out_trade_no text DEFAULT '',
  status public.withdrawal_status NOT NULL DEFAULT 'Pending',
  auditor uuid REFERENCES auth.users(id),
  auditor_name text DEFAULT '',
  transferor uuid REFERENCES auth.users(id),
  transferor_name text DEFAULT '',
  lock_user uuid REFERENCES auth.users(id),
  lock_user_name text DEFAULT '',
  lock_flag public.lock_flag NOT NULL DEFAULT 'unlocked',
  first_withdrawal boolean NOT NULL DEFAULT false,
  remark text DEFAULT '',
  payment_time timestamptz,
  notify_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_withdrawals_player ON public.withdrawals(player_id);
CREATE INDEX idx_withdrawals_created ON public.withdrawals(created_at DESC);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_withdrawals_updated BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== DEPOSITS (payed records) ==========
CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  coins numeric(18,2) NOT NULL,
  channel text DEFAULT '',
  status text NOT NULL DEFAULT 'Successful',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deposits_player ON public.deposits(player_id);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- ========== BETS ==========
CREATE TABLE public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL,
  stake numeric(18,2) NOT NULL,
  win_amount numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bets_player ON public.bets(player_id);
GRANT SELECT, INSERT ON public.bets TO authenticated;
GRANT ALL ON public.bets TO service_role;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- ========== MAILS ==========
CREATE TABLE public.mails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  sent_by uuid REFERENCES auth.users(id),
  sent_by_name text DEFAULT 'System',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mails_player ON public.mails(player_id, created_at DESC);
GRANT SELECT, UPDATE ON public.mails TO authenticated;
GRANT ALL ON public.mails TO service_role;
ALTER TABLE public.mails ENABLE ROW LEVEL SECURITY;

-- ========== AUDIT LOGS ==========
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid REFERENCES auth.users(id),
  actor_name text,
  action text NOT NULL,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ========== WITHDRAWAL STATUS HISTORY ==========
CREATE TABLE public.withdrawal_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  from_status public.withdrawal_status,
  to_status public.withdrawal_status NOT NULL,
  actor uuid REFERENCES auth.users(id),
  actor_name text,
  remark text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawal_status_history TO authenticated;
GRANT ALL ON public.withdrawal_status_history TO service_role;
ALTER TABLE public.withdrawal_status_history ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES ==========
-- profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- wallets
CREATE POLICY "wallets_self_read" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- withdrawals
CREATE POLICY "withdrawals_self_read" ON public.withdrawals FOR SELECT TO authenticated
  USING (player_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "withdrawals_self_insert" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid() AND status = 'Pending' AND lock_flag = 'unlocked');

-- deposits
CREATE POLICY "deposits_self_read" ON public.deposits FOR SELECT TO authenticated
  USING (player_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "deposits_self_insert" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

-- bets
CREATE POLICY "bets_self_read" ON public.bets FOR SELECT TO authenticated
  USING (player_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "bets_self_insert" ON public.bets FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid());

-- mails
CREATE POLICY "mails_self_read" ON public.mails FOR SELECT TO authenticated
  USING (player_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "mails_self_mark_read" ON public.mails FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- audit logs
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- status history
CREATE POLICY "wsh_read" ON public.withdrawal_status_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.withdrawals w WHERE w.id = withdrawal_id AND w.player_id = auth.uid()
  ));

-- ========== NEW USER TRIGGER ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nick, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nick', split_part(COALESCE(NEW.email,''),'@',1), 'Player'),
    NEW.email,
    NEW.phone
  );
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== BUSINESS FUNCTIONS ==========

-- Claim first admin: if no admins exist, promote current user
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE any_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') INTO any_admin;
  IF any_admin THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(),'admin')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(),'auditor')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(),'payer')
    ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;

-- Grant/revoke role (admin only)
CREATE OR REPLACE FUNCTION public.grant_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
END; $$;

-- Mock deposit for a player (self top-up in preview)
CREATE OR REPLACE FUNCTION public.mock_deposit(_amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _order text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  _order := 'P' || to_char(now(),'YYMMDDHH24MISS') || lpad(floor(random()*10000)::text,4,'0');
  INSERT INTO public.deposits(order_no, player_id, amount, coins, channel, status)
    VALUES (_order, auth.uid(), _amount, _amount, 'Mock', 'Successful')
    RETURNING id INTO _id;
  UPDATE public.wallets SET
    coins = coins + _amount,
    total_payed = total_payed + _amount,
    total_payed_times = total_payed_times + 1,
    last_payed_at = now()
  WHERE user_id = auth.uid();
  RETURN _id;
END; $$;

-- Create withdrawal (player)
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount numeric, _payout_mode text, _account_no text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _order text; _bal numeric; _first boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is 1000'; END IF;
  SELECT coins INTO _bal FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF _bal < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  SELECT NOT EXISTS(SELECT 1 FROM public.withdrawals WHERE player_id = auth.uid()) INTO _first;
  _order := 'T' || to_char(now(),'YYMMDDHH24MISS') || lpad(floor(random()*10000)::text,4,'0');
  UPDATE public.wallets SET coins = coins - _amount, frozen = frozen + _amount WHERE user_id = auth.uid();
  INSERT INTO public.withdrawals(order_no, player_id, apply_amount, fee, actual_amount, payout_mode, account_no, first_withdrawal, status)
    VALUES (_order, auth.uid(), _amount, 0, _amount, _payout_mode, _account_no, _first, 'Pending')
    RETURNING id INTO _id;
  INSERT INTO public.withdrawal_status_history(withdrawal_id, from_status, to_status, actor, remark)
    VALUES (_id, NULL, 'Pending', auth.uid(), 'created');
  RETURN _id;
END; $$;

-- Helper: staff name
CREATE OR REPLACE FUNCTION public.staff_display_name(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p.nick,''), split_part(u.email,'@',1), 'Staff')
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = _uid;
$$;

-- Approve withdrawal (auditor/admin): Pending -> Audited
CREATE OR REPLACE FUNCTION public.approve_withdrawal(_id uuid, _remark text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _cur public.withdrawal_status; _name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT player_id, status INTO _pid, _cur FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF _cur <> 'Pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;
  _name := public.staff_display_name(auth.uid());
  UPDATE public.withdrawals SET status='Audited', auditor=auth.uid(), auditor_name=_name, remark=_remark WHERE id=_id;
  INSERT INTO public.withdrawal_status_history(withdrawal_id, from_status, to_status, actor, actor_name, remark)
    VALUES (_id, _cur, 'Audited', auth.uid(), _name, _remark);
  IF COALESCE(_remark,'') <> '' THEN
    INSERT INTO public.mails(player_id, subject, body, sent_by, sent_by_name)
      VALUES (_pid, 'Withdrawal approved', _remark, auth.uid(), _name);
  END IF;
END; $$;

-- Reject withdrawal: Pending -> Reject, refund frozen
CREATE OR REPLACE FUNCTION public.reject_withdrawal(_id uuid, _remark text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _cur public.withdrawal_status; _amt numeric; _name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT player_id, status, apply_amount INTO _pid, _cur, _amt FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF _cur <> 'Pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;
  _name := public.staff_display_name(auth.uid());
  UPDATE public.wallets SET coins = coins + _amt, frozen = frozen - _amt WHERE user_id = _pid;
  UPDATE public.withdrawals SET status='Reject', auditor=auth.uid(), auditor_name=_name, remark=_remark WHERE id=_id;
  INSERT INTO public.withdrawal_status_history(withdrawal_id, from_status, to_status, actor, actor_name, remark)
    VALUES (_id, _cur, 'Reject', auth.uid(), _name, _remark);
  INSERT INTO public.mails(player_id, subject, body, sent_by, sent_by_name)
    VALUES (_pid, 'Withdrawal rejected', COALESCE(NULLIF(_remark,''),'Your withdrawal was rejected and refunded.'), auth.uid(), _name);
END; $$;

-- Risk control: Pending -> Freeze, move to safe_coins (funds seized)
CREATE OR REPLACE FUNCTION public.risk_control_withdrawal(_id uuid, _remark text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _cur public.withdrawal_status; _amt numeric; _name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT player_id, status, apply_amount INTO _pid, _cur, _amt FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF _cur <> 'Pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;
  _name := public.staff_display_name(auth.uid());
  UPDATE public.wallets SET frozen = frozen - _amt, safe_coins = safe_coins + _amt WHERE user_id = _pid;
  UPDATE public.withdrawals SET status='Freeze', lock_flag='locked', lock_user=auth.uid(), lock_user_name=_name,
    auditor=auth.uid(), auditor_name=_name, remark=_remark WHERE id=_id;
  INSERT INTO public.withdrawal_status_history(withdrawal_id, from_status, to_status, actor, actor_name, remark)
    VALUES (_id, _cur, 'Freeze', auth.uid(), _name, _remark);
  INSERT INTO public.mails(player_id, subject, body, sent_by, sent_by_name)
    VALUES (_pid, 'Withdrawal frozen', COALESCE(NULLIF(_remark,''),'Your withdrawal is under risk control.'), auth.uid(), _name);
END; $$;

-- Mark paid: Audited -> Successful, remove frozen, credit stats
CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(_id uuid, _out_trade_no text, _channel text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _cur public.withdrawal_status; _amt numeric; _name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'payer') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT player_id, status, actual_amount INTO _pid, _cur, _amt FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF _cur NOT IN ('Audited','Paying Out') THEN RAISE EXCEPTION 'Order not payable'; END IF;
  _name := public.staff_display_name(auth.uid());
  UPDATE public.wallets SET frozen = frozen - _amt,
    total_withdrawal = total_withdrawal + _amt,
    total_withdraw_times = total_withdraw_times + 1
   WHERE user_id = _pid;
  UPDATE public.withdrawals SET status='Successful', transferor=auth.uid(), transferor_name=_name,
    out_trade_no=_out_trade_no, channel=_channel, payment_time=now(), notify_time=now() WHERE id=_id;
  INSERT INTO public.withdrawal_status_history(withdrawal_id, from_status, to_status, actor, actor_name)
    VALUES (_id, _cur, 'Successful', auth.uid(), _name);
  INSERT INTO public.mails(player_id, subject, body, sent_by, sent_by_name)
    VALUES (_pid, 'Withdrawal paid', 'Your withdrawal has been paid.', auth.uid(), _name);
END; $$;

CREATE OR REPLACE FUNCTION public.lock_withdrawal(_id uuid, _lock boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  _name := public.staff_display_name(auth.uid());
  UPDATE public.withdrawals SET
    lock_flag = CASE WHEN _lock THEN 'locked'::public.lock_flag ELSE 'unlocked'::public.lock_flag END,
    lock_user = CASE WHEN _lock THEN auth.uid() ELSE NULL END,
    lock_user_name = CASE WHEN _lock THEN _name ELSE '' END
  WHERE id = _id;
END; $$;

-- Admin: send arbitrary mail
CREATE OR REPLACE FUNCTION public.send_mail(_player_id uuid, _subject text, _body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _name text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  _name := public.staff_display_name(auth.uid());
  INSERT INTO public.mails(player_id, subject, body, sent_by, sent_by_name)
    VALUES (_player_id, _subject, _body, auth.uid(), _name) RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- ========== REALTIME ==========
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
