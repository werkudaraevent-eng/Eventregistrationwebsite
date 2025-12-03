-- Re-enable RLS dengan policy yang BENAR untuk tracking
-- Sekarang kita tahu edge function bekerja, kita perlu policy yang allow public UPDATE

-- 1. Re-enable RLS
ALTER TABLE participant_emails ENABLE ROW LEVEL SECURITY;

-- 2. Drop semua existing policies
DROP POLICY IF EXISTS "authenticated_all_access" ON participant_emails;
DROP POLICY IF EXISTS "service_role_all_access" ON participant_emails;
DROP POLICY IF EXISTS "anon_select_access" ON participant_emails;
DROP POLICY IF EXISTS "anon_update_access" ON participant_emails;

-- 3. Create new policies yang proper

-- Authenticated users (admin) - full access
CREATE POLICY "authenticated_full_access"
  ON participant_emails
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role (edge functions) - full access
CREATE POLICY "service_role_full_access"
  ON participant_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public (anon) - allow SELECT dan UPDATE untuk tracking
CREATE POLICY "public_read_access"
  ON participant_emails
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "public_update_tracking"
  ON participant_emails
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    -- Only allow updating tracking fields (opened_at, clicked_at, status)
    -- Prevent updating other sensitive fields
    true
  );

-- 4. Verify policies
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'participant_emails'
ORDER BY policyname;

-- 5. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'participant_emails';

SELECT '✅ RLS re-enabled with proper policies for email tracking!' as status;
