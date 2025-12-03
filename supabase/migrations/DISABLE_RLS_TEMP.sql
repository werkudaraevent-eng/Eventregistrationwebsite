-- TEMPORARY FIX: Disable RLS on participant_emails untuk allow public update dari edge function
-- WARNING: Ini temporary solution, nanti harus di-refine

-- Disable RLS temporarily
ALTER TABLE participant_emails DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'participant_emails';

-- Should show: rowsecurity = false

-- NOTE: Setelah ini test lagi dengan buka tracking URL
-- Jika berhasil, kita bisa re-enable RLS dengan policy yang lebih permissive
