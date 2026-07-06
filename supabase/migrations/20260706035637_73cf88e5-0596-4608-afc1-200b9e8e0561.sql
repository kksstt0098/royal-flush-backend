
-- =========================
-- Promotions
-- =========================
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  promo_type text NOT NULL CHECK (promo_type IN ('deposit_bonus','cashback','vip_reward')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  start_date timestamptz,
  end_date timestamptz,
  bonus_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  wagering_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  game_contribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  link_action text NOT NULL DEFAULT 'open_promotion_page'
    CHECK (link_action IN ('open_promotion_page','apply_bonus_direct','redirect_url')),
  redirect_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promotions"
  ON public.promotions FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date   IS NULL OR end_date   >  now())
  );

CREATE POLICY "Staff can read all promotions"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert promotions"
  ON public.promotions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update promotions"
  ON public.promotions FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can delete promotions"
  ON public.promotions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER promotions_set_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX promotions_status_window_idx
  ON public.promotions (status, start_date, end_date);

-- =========================
-- Link promo_banners -> promotions
-- =========================
ALTER TABLE public.promo_banners
  ADD COLUMN promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN link_action text CHECK (link_action IN ('open_promotion_page','apply_bonus_direct','redirect_url')),
  ADD COLUMN redirect_url text;

CREATE INDEX promo_banners_promotion_idx ON public.promo_banners (promotion_id);

-- =========================
-- Tracking
-- =========================
CREATE TABLE public.banner_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES public.promo_banners(id) ON DELETE CASCADE,
  user_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.banner_impressions TO authenticated;
GRANT ALL ON public.banner_impressions TO service_role;
ALTER TABLE public.banner_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own impressions"
  ON public.banner_impressions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can read impressions"
  ON public.banner_impressions FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX banner_impressions_banner_time_idx
  ON public.banner_impressions (banner_id, occurred_at DESC);

CREATE TABLE public.banner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES public.promo_banners(id) ON DELETE CASCADE,
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  user_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.banner_clicks TO authenticated;
GRANT ALL ON public.banner_clicks TO service_role;
ALTER TABLE public.banner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own clicks"
  ON public.banner_clicks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can read clicks"
  ON public.banner_clicks FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX banner_clicks_banner_time_idx
  ON public.banner_clicks (banner_id, occurred_at DESC);
CREATE INDEX banner_clicks_promotion_time_idx
  ON public.banner_clicks (promotion_id, occurred_at DESC);

CREATE TABLE public.promotion_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  deposit_amount numeric(18,2) NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.promotion_conversions TO authenticated;
GRANT ALL ON public.promotion_conversions TO service_role;
ALTER TABLE public.promotion_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own conversions"
  ON public.promotion_conversions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can read conversions"
  ON public.promotion_conversions FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX promotion_conversions_promotion_time_idx
  ON public.promotion_conversions (promotion_id, occurred_at DESC);
