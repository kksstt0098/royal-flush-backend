
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS remark text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS credit_type text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS created_by_name text;

CREATE OR REPLACE FUNCTION public.admin_credit_player(_player_id uuid, _amount numeric, _credit_type text, _remark text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid; _order text; _name text; _prefix text; _channel text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'payer')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _credit_type NOT IN ('Bonus','Manual') THEN RAISE EXCEPTION 'Invalid credit_type'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = _player_id) THEN
    RAISE EXCEPTION 'Player wallet not found';
  END IF;
  _name := public.staff_display_name(auth.uid());
  _prefix := CASE WHEN _credit_type = 'Bonus' THEN 'B' ELSE 'M' END;
  _channel := CASE WHEN _credit_type = 'Bonus' THEN 'Bonus' ELSE 'Manual Deposit' END;
  _order := _prefix || to_char(now(),'YYMMDDHH24MISS') || lpad(floor(random()*10000)::text,4,'0');
  INSERT INTO public.deposits(order_no, player_id, amount, coins, channel, status, remark, credit_type, created_by, created_by_name)
    VALUES (_order, _player_id, _amount, _amount, _channel, 'Successful', _remark, _credit_type, auth.uid(), _name)
    RETURNING id INTO _id;
  IF _credit_type = 'Manual' THEN
    UPDATE public.wallets SET
      coins = coins + _amount,
      total_payed = total_payed + _amount,
      total_payed_times = total_payed_times + 1,
      last_payed_at = now()
    WHERE user_id = _player_id;
  ELSE
    UPDATE public.wallets SET coins = coins + _amount WHERE user_id = _player_id;
  END IF;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_credit_player(uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_credit_player(uuid, numeric, text, text) TO authenticated;
