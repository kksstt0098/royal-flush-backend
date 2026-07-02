
CREATE POLICY "Public read lobby banner images" ON storage.objects
  FOR SELECT USING (bucket_id = 'lobby-banners');

CREATE POLICY "Admins upload lobby banner images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lobby-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update lobby banner images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lobby-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete lobby banner images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lobby-banners' AND public.has_role(auth.uid(), 'admin'));
