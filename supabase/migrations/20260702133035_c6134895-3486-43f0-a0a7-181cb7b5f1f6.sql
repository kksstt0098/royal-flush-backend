CREATE POLICY "Promo banners read"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'promo-banners');

CREATE POLICY "Promo banners admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promo-banners' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Promo banners admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Promo banners admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(),'admin'));
