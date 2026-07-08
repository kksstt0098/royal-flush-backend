CREATE TYPE public.cs_channel_type AS ENUM (
  'telegram','whatsapp','livechat','viber','messenger','line','wechat','email','phone','url'
);

CREATE TYPE public.cs_audience AS ENUM ('all','players','staff');

CREATE TABLE public.cs_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.cs_channel_type NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  icon text,
  color text,
  bg_color text,
  open_in_new_tab boolean NOT NULL DEFAULT true,
  audience public.cs_audience NOT NULL DEFAULT 'all',
  position text NOT NULL DEFAULT 'floating',
  display_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  remark text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_name text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_configs TO authenticated;
GRANT SELECT ON public.cs_configs TO anon;
GRANT ALL ON public.cs_configs TO service_role;

ALTER TABLE public.cs_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read enabled cs" ON public.cs_configs
  FOR SELECT TO anon, authenticated
  USING (enabled = true);

CREATE POLICY "Admins read all cs" ON public.cs_configs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins insert cs" ON public.cs_configs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update cs" ON public.cs_configs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete cs" ON public.cs_configs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER cs_configs_set_updated_at
  BEFORE UPDATE ON public.cs_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX cs_configs_order_idx ON public.cs_configs (display_order, created_at);
