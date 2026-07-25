
DROP POLICY IF EXISTS bets_self_insert ON public.bets;
DROP POLICY IF EXISTS deposits_self_insert ON public.deposits;
DROP POLICY IF EXISTS "Users can log own conversions" ON public.promotion_conversions;

CREATE POLICY bets_no_client_insert ON public.bets AS RESTRICTIVE
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY deposits_no_client_insert ON public.deposits AS RESTRICTIVE
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY promotion_conversions_no_client_insert ON public.promotion_conversions AS RESTRICTIVE
  FOR INSERT TO authenticated, anon WITH CHECK (false);
