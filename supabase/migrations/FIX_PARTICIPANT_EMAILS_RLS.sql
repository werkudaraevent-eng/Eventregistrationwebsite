-- Fix RLS Policy for participant_emails
-- Allow authenticated users to insert email logs

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Allow service role to manage participant emails" ON participant_emails;

-- Create new policies for authenticated users
CREATE POLICY "Allow authenticated users to insert participant emails"
  ON participant_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update participant emails"
  ON participant_emails
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Keep service role policy for all operations
CREATE POLICY "Allow service role full access to participant emails"
  ON participant_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'participant_emails'
ORDER BY policyname;

-- Success message
SELECT '✅ RLS policies updated for participant_emails!' as status;
SELECT '✅ Authenticated users can now insert and update email logs' as info;
