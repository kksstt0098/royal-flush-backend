
-- Allow service_role to drive the queue drainer
CREATE OR REPLACE FUNCTION public.mail_worker_read_batch(_qty int, _vt int)
RETURNS SETOF pgmq.message_record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM pgmq.read('mail_dispatch', _vt, _qty);
END $$;

CREATE OR REPLACE FUNCTION public.mail_worker_dispatch(_campaign_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.mail_campaigns%ROWTYPE;
  _inserted int := 0;
BEGIN
  SELECT * INTO c FROM public.mail_campaigns WHERE id = _campaign_id FOR UPDATE;
  IF NOT FOUND OR c.deleted_at IS NOT NULL THEN RETURN 0; END IF;
  IF c.status NOT IN ('scheduled','dispatching') THEN RETURN 0; END IF;
  IF c.send_time > now() THEN RETURN -1; END IF;

  UPDATE public.mail_campaigns SET status = 'dispatching' WHERE id = _campaign_id;
  PERFORM public.mail_ensure_partition(now()::date);

  IF c.recipient_type = 'all_users' THEN
    INSERT INTO public.mail_recipients(campaign_id, user_id, subject, body_html, end_time)
    SELECT c.id, u.id, c.subject, c.body_html, c.end_time
      FROM auth.users u
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted = ROW_COUNT;
  ELSE
    INSERT INTO public.mail_recipients(campaign_id, user_id, subject, body_html, end_time)
    SELECT c.id, uid, c.subject, c.body_html, c.end_time
      FROM unnest(c.recipient_ids) AS uid
     WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted = ROW_COUNT;
  END IF;

  UPDATE public.mail_campaigns
     SET status = 'sent',
         total_recipients = _inserted,
         delivered_count = _inserted
   WHERE id = _campaign_id;
  RETURN _inserted;
END $$;

CREATE OR REPLACE FUNCTION public.mail_worker_delete(_msg_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.delete('mail_dispatch', _msg_id);
END $$;

REVOKE EXECUTE ON FUNCTION public.mail_worker_read_batch(int,int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mail_worker_dispatch(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mail_worker_delete(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mail_worker_read_batch(int,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.mail_worker_dispatch(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mail_worker_delete(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.mail_expire_due() TO service_role;
