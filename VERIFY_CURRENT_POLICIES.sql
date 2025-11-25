-- Verify current RLS policies on participant_emails table

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

-- Also check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'participant_emails';
