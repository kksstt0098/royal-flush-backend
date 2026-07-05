
-- Enable RLS on already-created partitions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
     WHERE p.relname = 'mail_recipients'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- Update helper to enable RLS on new partitions going forward
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
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _name);
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id, created_at DESC)
       WHERE status = ''delivered'' AND deleted_at IS NULL',
    _name || '_inbox_idx', _name);
  EXECUTE format(
    'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (campaign_id, user_id)',
    _name || '_uniq_idx', _name);
END $$;
