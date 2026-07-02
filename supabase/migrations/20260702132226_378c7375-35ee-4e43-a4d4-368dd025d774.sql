
CREATE TABLE public.lobby_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  duration_seconds integer NOT NULL DEFAULT 5 CHECK (duration_seconds > 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lobby_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lobby_banners TO authenticated;
GRANT ALL ON public.lobby_banners TO service_role;

ALTER TABLE public.lobby_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.lobby_banners
  FOR SELECT USING (true);

CREATE POLICY "Admins manage banners insert" ON public.lobby_banners
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage banners update" ON public.lobby_banners
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage banners delete" ON public.lobby_banners
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lobby_banners_updated_at
  BEFORE UPDATE ON public.lobby_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX lobby_banners_sort_idx ON public.lobby_banners (sort_order, created_at);
