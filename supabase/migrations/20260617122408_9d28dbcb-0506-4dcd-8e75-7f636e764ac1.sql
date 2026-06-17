REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- storage policies for the private study-pdfs bucket: users can only access their own folder
CREATE POLICY "study_pdfs_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'study-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "study_pdfs_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'study-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "study_pdfs_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'study-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);