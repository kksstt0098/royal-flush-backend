CREATE TABLE public.ads_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_categories TO authenticated;
GRANT ALL ON public.ads_categories TO service_role;

ALTER TABLE public.ads_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read ads categories"
  ON public.ads_categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert ads categories"
  ON public.ads_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'payer'));

CREATE POLICY "Admins can update ads categories"
  ON public.ads_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'payer'));

CREATE POLICY "Admins can delete ads categories"
  ON public.ads_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'payer'));

CREATE TRIGGER ads_categories_set_updated_at
  BEFORE UPDATE ON public.ads_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ads_categories_sort_idx ON public.ads_categories(sort_order, created_at);

ALTER TABLE public.promo_banners
  ADD COLUMN category_id UUID REFERENCES public.ads_categories(id) ON DELETE SET NULL;

CREATE INDEX promo_banners_category_idx ON public.promo_banners(category_id);
