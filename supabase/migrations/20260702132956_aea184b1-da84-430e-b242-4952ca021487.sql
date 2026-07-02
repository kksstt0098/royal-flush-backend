CREATE TABLE public.promo_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  content_html text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promo_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_banners TO authenticated;
GRANT ALL ON public.promo_banners TO service_role;

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo banners"
  ON public.promo_banners FOR SELECT
  USING (active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'payer'));

CREATE POLICY "Admins can insert promo banners"
  ON public.promo_banners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update promo banners"
  ON public.promo_banners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can delete promo banners"
  ON public.promo_banners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX promo_banners_sort_idx ON public.promo_banners (sort_order, created_at);

CREATE TRIGGER promo_banners_set_updated_at
  BEFORE UPDATE ON public.promo_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
