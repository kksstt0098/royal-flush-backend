
-- Fix 1: Prevent players from escalating privileges via profile self-update
DROP TRIGGER IF EXISTS guard_profile_privileged_columns_trg ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- Fix 2: Align promo_banners table read access with admin-only storage policy
DROP POLICY IF EXISTS "Anyone can view active promo banners" ON public.promo_banners;
CREATE POLICY "Staff can view promo banners"
  ON public.promo_banners
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));
