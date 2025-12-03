-- =====================================================
-- Fix Storage Upload Policy for participant-qr-codes
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public uploads to participant-qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to participant-qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to participant-qr-codes" ON storage.objects;

-- Policy 1: Allow PUBLIC uploads (no authentication required)
CREATE POLICY "Allow public uploads to participant-qr-codes"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'participant-qr-codes');

-- Policy 2: Allow PUBLIC read access
CREATE POLICY "Allow public read access to participant-qr-codes"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'participant-qr-codes');

-- Policy 3: Allow PUBLIC updates (for upsert)
CREATE POLICY "Allow public updates to participant-qr-codes"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'participant-qr-codes')
WITH CHECK (bucket_id = 'participant-qr-codes');

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%participant-qr-codes%';

-- Success message
SELECT '✅ Storage policies configured successfully!' as status;
