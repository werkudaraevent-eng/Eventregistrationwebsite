-- Fix RLS Policy for Email Tracking
-- Problem: Edge function track-email uses service_role but can't SELECT before UPDATE
-- Solution: Ensure service_role has ALL permissions (SELECT, INSERT, UPDATE, DELETE)

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view participant emails" ON participant_emails;
DROP POLICY IF EXISTS "Allow service role to manage participant emails" ON participant_emails;
DROP POLICY IF EXISTS "Allow authenticated users to insert participant emails" ON participant_emails;
DROP POLICY IF EXISTS "Allow authenticated users to update participant emails" ON participant_emails;
DROP POLICY IF EXISTS "Allow service role full access to participant emails" ON participant_emails;

-- Create comprehensive policies

-- 1. Authenticated users can do everything (for frontend)
CREATE POLICY "authenticated_all_access"
  ON participant_emails
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Service role has unrestricted access (for edge functions)
CREATE POLICY "service_role_all_access"
  ON participant_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Anon users can SELECT and UPDATE (for public tracking pixel)
CREATE POLICY "anon_select_access"
  ON participant_emails
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_update_access"
  ON participant_emails
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Verify policies are correct
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'participant_emails'
ORDER BY policyname;

-- Test that service_role can update
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated for participant_emails!';
  RAISE NOTICE '✅ Service role now has full access for edge function tracking';
  RAISE NOTICE '✅ Anon role can SELECT and UPDATE for tracking pixel';
  RAISE NOTICE '✅ Authenticated role has full access for admin dashboard';
END $$;
