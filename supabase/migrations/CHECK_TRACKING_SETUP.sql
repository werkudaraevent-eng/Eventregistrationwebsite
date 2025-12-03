-- Comprehensive check for email tracking issues
-- Run this to verify everything is set up correctly

-- 1. Check RLS policies
SELECT 
  policyname, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename = 'participant_emails'
ORDER BY policyname;

-- Expected result:
-- Should have policies for: authenticated (ALL), service_role (ALL), anon (SELECT, UPDATE)

-- 2. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'participant_emails';

-- Expected: rls_enabled = true

-- 3. Get latest email logs to test with
SELECT 
  id,
  participant_id,
  status,
  opened_at,
  sent_at,
  subject
FROM participant_emails
ORDER BY created_at DESC
LIMIT 5;

-- 4. Test UPDATE permission (this simulates what edge function does)
-- Replace EM_ID_HERE with actual email log ID from step 3
-- UPDATE participant_emails 
-- SET opened_at = now(), status = 'opened'
-- WHERE id = 'EM_ID_HERE' AND opened_at IS NULL;

-- 5. If update fails, check detailed error with:
-- SHOW client_min_messages;
-- SET client_min_messages TO 'debug';

SELECT '✅ Check complete! Review results above' as status;
