
-- =====================================================================
-- PHASE A: Mail Box schema, RPCs, and queue
-- =====================================================================

-- Extensions (idempotent; pgmq/pg_cron already enabled for email infra)
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE public.mail_recipient_type AS ENUM ('all_users','single_user','bulk_users','event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mail_campaign_status AS ENUM
    ('draft','scheduled','dispatching','sent','expired','cancelled','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mail_delivery_status AS ENUM
    ('pending','delivered','failed','expired','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mail_event_kind AS ENUM
    ('user_registered','deposit_approved','withdrawal_approved','withdrawal_rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- mail_templates ----------
CREATE TABLE IF NOT EXISTS public.mail_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_templates TO authenticated;
GRANT ALL ON public.mail_templates TO service_role;
ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read templates" ON public.mail_templates
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
-- writes only via SECURITY DEFINER RPCs

CREATE TRIGGER trg_mail_templates_updated
  BEFORE UPDATE ON public.mail_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- mail_campaigns ----------
CREATE TABLE IF NOT EXISTS public.mail_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type public.mail_recipient_type NOT NULL,
  recipient_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  template_id uuid REFERENCES public.mail_templates(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status public.mail_campaign_status NOT NULL DEFAULT 'scheduled',
  total_recipients int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  read_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_by_name text,
  event_kind public.mail_event_kind,
  event_ref uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_campaigns TO authenticated;
GRANT ALL ON public.mail_campaigns TO service_role;
ALTER TABLE public.mail_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read campaigns" ON public.mail_campaigns
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_mail_campaigns_status_send
  ON public.mail_campaigns (status, send_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_created_by
  ON public.mail_campaigns (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_event
  ON public.mail_campaigns (event_kind, event_ref);

CREATE TRIGGER trg_mail_campaigns_updated
  BEFORE UPDATE ON public.mail_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- mail_recipients (partitioned by created_at) ----------
CREATE TABLE IF NOT EXISTS public.mail_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.mail_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL,
  status public.mail_delivery_status NOT NULL DEFAULT 'delivered',
  read_at timestamptz,
  end_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

GRANT SELECT, UPDATE ON public.mail_recipients TO authenticated;
GRANT ALL ON public.mail_recipients TO service_role;
ALTER TABLE public.mail_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Player reads own mail" ON public.mail_recipients
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND (end_time IS NULL OR end_time > now())
  );
CREATE POLICY "Staff reads all mail" ON public.mail_recipients
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Player marks own mail read" ON public.mail_recipients
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_mail_recipients_campaign
  ON public.mail_recipients (campaign_id);

-- Helper: ensure monthly partition exists
CREATE OR REPLACE FUNCTION public.mail_ensure_partition(_month date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start date := date_trunc('month', _month)::date;
  _end   date := (date_trunc('month', _month) + interval '1 month')::date;
  _name  text := format('mail_recipients_%s', to_char(_start, 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.mail_recipients
       FOR VALUES FROM (%L) TO (%L)',
    _name, _start, _end);
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id, created_at DESC)
       WHERE status = ''delivered'' AND deleted_at IS NULL',
    _name || '_inbox_idx', _name);
  EXECUTE format(
    'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (campaign_id, user_id)',
    _name || '_uniq_idx', _name);
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_ensure_partition(date) FROM PUBLIC, anon, authenticated;

-- Bootstrap current + next 2 months
SELECT public.mail_ensure_partition(now()::date);
SELECT public.mail_ensure_partition((now() + interval '1 month')::date);
SELECT public.mail_ensure_partition((now() + interval '2 month')::date);

-- ---------- mail_event_rules ----------
CREATE TABLE IF NOT EXISTS public.mail_event_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_kind public.mail_event_kind NOT NULL,
  template_id uuid NOT NULL REFERENCES public.mail_templates(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_kind, template_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_event_rules TO authenticated;
GRANT ALL ON public.mail_event_rules TO service_role;
ALTER TABLE public.mail_event_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read rules" ON public.mail_event_rules
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_mail_event_rules_updated
  BEFORE UPDATE ON public.mail_event_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- mail_audit_logs ----------
CREATE TABLE IF NOT EXISTS public.mail_audit_logs (
  id bigserial PRIMARY KEY,
  actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_name text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mail_audit_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.mail_audit_logs_id_seq TO authenticated;
GRANT ALL ON public.mail_audit_logs TO service_role;
GRANT ALL ON SEQUENCE public.mail_audit_logs_id_seq TO service_role;
ALTER TABLE public.mail_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read audit" ON public.mail_audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_mail_audit_actor
  ON public.mail_audit_logs (actor, created_at DESC);

-- =====================================================================
-- pgmq queue
-- =====================================================================
SELECT pgmq.create('mail_dispatch');

-- =====================================================================
-- SECURITY DEFINER RPCs
-- =====================================================================

-- Create a campaign and enqueue dispatch
CREATE OR REPLACE FUNCTION public.mail_create_campaign(
  _recipient_type public.mail_recipient_type,
  _recipient_ids uuid[],
  _template_id uuid,
  _subject text,
  _body_html text,
  _template_data jsonb,
  _send_time timestamptz,
  _end_time timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'auditor')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _subject IS NULL OR length(trim(_subject)) = 0 THEN
    RAISE EXCEPTION 'Subject required';
  END IF;
  IF _body_html IS NULL OR length(trim(_body_html)) = 0 THEN
    RAISE EXCEPTION 'Body required';
  END IF;
  IF _end_time IS NOT NULL AND _end_time <= COALESCE(_send_time, now()) THEN
    RAISE EXCEPTION 'end_time must be after send_time';
  END IF;
  IF _recipient_type IN ('single_user','bulk_users')
     AND (_recipient_ids IS NULL OR array_length(_recipient_ids,1) IS NULL) THEN
    RAISE EXCEPTION 'recipient_ids required for this recipient_type';
  END IF;
  IF _recipient_type = 'bulk_users' AND array_length(_recipient_ids,1) > 100000 THEN
    RAISE EXCEPTION 'bulk recipients capped at 100000 per campaign';
  END IF;

  _name := public.staff_display_name(auth.uid());

  INSERT INTO public.mail_campaigns(
    recipient_type, recipient_ids, template_id, subject, body_html,
    template_data, send_time, end_time, status,
    created_by, created_by_name
  ) VALUES (
    _recipient_type, COALESCE(_recipient_ids, ARRAY[]::uuid[]),
    _template_id, _subject, _body_html,
    COALESCE(_template_data,'{}'::jsonb),
    COALESCE(_send_time, now()), _end_time, 'scheduled',
    auth.uid(), _name
  ) RETURNING id INTO _id;

  PERFORM pgmq.send('mail_dispatch', jsonb_build_object('campaign_id', _id));

  INSERT INTO public.mail_audit_logs(actor, actor_name, action, target_type, target_id, meta)
  VALUES (auth.uid(), _name, 'create_campaign', 'campaign', _id,
          jsonb_build_object('recipient_type', _recipient_type,
                             'recipients', COALESCE(array_length(_recipient_ids,1),0),
                             'send_time', _send_time,
                             'end_time', _end_time));
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_create_campaign(
  public.mail_recipient_type, uuid[], uuid, text, text, jsonb, timestamptz, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_create_campaign(
  public.mail_recipient_type, uuid[], uuid, text, text, jsonb, timestamptz, timestamptz
) TO authenticated;

-- Player: mark one recipient row as read
CREATE OR REPLACE FUNCTION public.mail_mark_read(_recipient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _cid uuid; _uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  UPDATE public.mail_recipients
     SET read_at = now()
   WHERE id = _recipient_id
     AND user_id = auth.uid()
     AND read_at IS NULL
     AND deleted_at IS NULL
  RETURNING campaign_id, user_id INTO _cid, _uid;
  IF _cid IS NOT NULL THEN
    UPDATE public.mail_campaigns
       SET read_count = read_count + 1
     WHERE id = _cid;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_mark_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_mark_read(uuid) TO authenticated;

-- Admin: soft delete campaign + recipients
CREATE OR REPLACE FUNCTION public.mail_soft_delete_campaign(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _name text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  _name := public.staff_display_name(auth.uid());
  UPDATE public.mail_campaigns
     SET deleted_at = now(), status = 'cancelled'
   WHERE id = _id AND deleted_at IS NULL;
  UPDATE public.mail_recipients
     SET deleted_at = now(), status = 'deleted'
   WHERE campaign_id = _id AND deleted_at IS NULL;
  INSERT INTO public.mail_audit_logs(actor, actor_name, action, target_type, target_id)
  VALUES (auth.uid(), _name, 'delete_campaign', 'campaign', _id);
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_soft_delete_campaign(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_soft_delete_campaign(uuid) TO authenticated;

-- Cron helper: flip expired campaigns
CREATE OR REPLACE FUNCTION public.mail_expire_due()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n int;
BEGIN
  WITH upd AS (
    UPDATE public.mail_campaigns
       SET status = 'expired'
     WHERE status = 'sent'
       AND end_time IS NOT NULL
       AND end_time <= now()
     RETURNING id
  ) SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_expire_due() FROM PUBLIC, anon, authenticated;

-- Event-driven enqueue (called by DB triggers in Phase D)
CREATE OR REPLACE FUNCTION public.mail_enqueue_event(
  _kind public.mail_event_kind,
  _user_id uuid,
  _ref uuid,
  _vars jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; _cid uuid;
BEGIN
  FOR r IN
    SELECT er.template_id, t.subject, t.body_html
      FROM public.mail_event_rules er
      JOIN public.mail_templates t ON t.id = er.template_id
     WHERE er.event_kind = _kind
       AND er.active = true
       AND t.active = true
     ORDER BY er.priority DESC
  LOOP
    INSERT INTO public.mail_campaigns(
      recipient_type, recipient_ids, template_id, subject, body_html,
      template_data, send_time, status, created_by, created_by_name,
      event_kind, event_ref
    ) VALUES (
      'event', ARRAY[_user_id]::uuid[], r.template_id, r.subject, r.body_html,
      COALESCE(_vars,'{}'::jsonb), now(), 'scheduled',
      _user_id, 'system', _kind, _ref
    ) RETURNING id INTO _cid;
    PERFORM pgmq.send('mail_dispatch', jsonb_build_object('campaign_id', _cid));
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_enqueue_event(public.mail_event_kind, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

-- Worker RPCs (SECURITY DEFINER so worker route can call via authenticated key)
CREATE OR REPLACE FUNCTION public.mail_worker_read_batch(_qty int, _vt int)
RETURNS SETOF pgmq.message_record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin')) THEN
    -- allow service role implicitly by SECURITY DEFINER + explicit staff only
    IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  END IF;
  RETURN QUERY SELECT * FROM pgmq.read('mail_dispatch', _vt, _qty);
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_worker_read_batch(int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_worker_read_batch(int,int) TO authenticated;

-- Fan-out executor: expand recipients and materialize mail_recipients rows
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
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO c FROM public.mail_campaigns WHERE id = _campaign_id FOR UPDATE;
  IF NOT FOUND OR c.deleted_at IS NOT NULL THEN RETURN 0; END IF;
  IF c.status NOT IN ('scheduled','dispatching') THEN RETURN 0; END IF;
  IF c.send_time > now() THEN RETURN -1; END IF; -- caller should defer

  UPDATE public.mail_campaigns SET status = 'dispatching' WHERE id = _campaign_id;

  -- Ensure partition for now exists (idempotent)
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
REVOKE EXECUTE ON FUNCTION public.mail_worker_dispatch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_worker_dispatch(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mail_worker_delete(_msg_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN pgmq.delete('mail_dispatch', _msg_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.mail_worker_delete(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_worker_delete(bigint) TO authenticated;
