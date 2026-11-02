SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'ccfv-club-assets';

SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'ccfv_league_club_assets_%'
ORDER BY policyname;
