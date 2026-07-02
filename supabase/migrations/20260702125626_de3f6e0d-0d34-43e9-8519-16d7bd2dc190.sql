
CREATE OR REPLACE FUNCTION public.admin_adjust_player(_player_id uuid, _amount numeric, _remark text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _id uuid; _order text; _name text; _prefix text; _channel text; _ctype text; _bal numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'payer')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _amount = 0 OR _amount IS NULL THEN RAISE EXCEPTION 'Amount cannot be zero'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = _player_id) THEN
    RAISE EXCEPTION 'Player wallet not found';
  END IF;

  IF _amount < 0 THEN
    SELECT coins INTO _bal FROM public.wallets WHERE user_id = _player_id FOR UPDATE;
    IF _bal + _amount < 0 THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    _prefix := 'D';
    _channel := 'Manual Debit';
    _ctype := 'Debit';
  ELSE
    _prefix := 'M';
    _channel := 'Manual Deposit';
    _ctype := 'Manual';
  END IF;

  _name := public.staff_display_name(auth.uid());
  _order := _prefix || to_char(now(),'YYMMDDHH24MISS') || lpad(floor(random()*10000)::text,4,'0');

  INSERT INTO public.deposits(order_no, player_id, amount, coins, channel, status, remark, credit_type, created_by, created_by_name)
    VALUES (_order, _player_id, _amount, _amount, _channel, 'Successful', _remark, _ctype, auth.uid(), _name)
    RETURNING id INTO _id;

  IF _amount > 0 THEN
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
$function$;
