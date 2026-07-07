
-- Enum for target audience
DO $$ BEGIN
  CREATE TYPE public.marquee_audience AS ENUM ('all','players','vip','new_users','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marquee_position AS ENUM ('top','bottom','both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main marquee messages table
CREATE TABLE public.marquee_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL CHECK (length(trim(content)) > 0),
  link_url text,
  position public.marquee_position NOT NULL DEFAULT 'top',
  scroll_speed int NOT NULL DEFAULT 50 CHECK (scroll_speed BETWEEN 10 AND 200),
  priority int NOT NULL DEFAULT 0,
  text_color text NOT NULL DEFAULT '#ffffff',
  background_color text NOT NULL DEFAULT '#1e293b',
  font_weight text NOT NULL DEFAULT 'normal',
  icon text,
  target_audience public.marquee_audience NOT NULL DEFAULT 'all',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  is_pinned boolean NOT NULL DEFAULT false,
  display_count bigint NOT NULL DEFAULT 0,
  click_count bigint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marquee_messages TO authenticated;
GRANT SELECT ON public.marquee_messages TO anon;
GRANT ALL ON public.marquee_messages TO service_role;

ALTER TABLE public.marquee_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage marquee" ON public.marquee_messages
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Public read active marquee" ON public.marquee_messages
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND start_at <= now()
    AND (end_at IS NULL OR end_at > now())
  );

CREATE INDEX idx_marquee_active ON public.marquee_messages (is_active, start_at, end_at)
  WHERE is_active = true;
CREATE INDEX idx_marquee_priority ON public.marquee_messages (is_pinned DESC, priority DESC, created_at DESC);

CREATE TRIGGER trg_marquee_updated_at
  BEFORE UPDATE ON public.marquee_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Click logs
CREATE TABLE public.marquee_click_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.marquee_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.marquee_click_logs TO authenticated;
GRANT INSERT ON public.marquee_click_logs TO anon;
GRANT ALL ON public.marquee_click_logs TO service_role;

ALTER TABLE public.marquee_click_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read click logs" ON public.marquee_click_logs
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Anyone insert click logs" ON public.marquee_click_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_marquee_clicks_message ON public.marquee_click_logs (message_id, created_at DESC);

-- Helper RPC to atomically increment counters
CREATE OR REPLACE FUNCTION public.marquee_increment(_id uuid, _field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _field = 'display' THEN
    UPDATE public.marquee_messages SET display_count = display_count + 1 WHERE id = _id;
  ELSIF _field = 'click' THEN
    UPDATE public.marquee_messages SET click_count = click_count + 1 WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Invalid field: %', _field;
  END IF;
END $$;
