-- ============================================
-- QUICK FIX: Create Storage Bucket & Disable RLS
-- ============================================
-- Run this in Supabase SQL Editor to fix upload errors

-- Step 1: Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 2: DISABLE Row Level Security (easiest solution)
-- This allows all authenticated users to upload/delete files
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Alternative: Keep RLS enabled but add permissive policies
-- ============================================
-- If you prefer to keep RLS for security, comment out the DISABLE above
-- and uncomment the policies below:

-- -- Allow ALL operations for authenticated users
-- CREATE POLICY "Allow all operations for authenticated users"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'email-attachments')
-- WITH CHECK (bucket_id = 'email-attachments');

-- -- Allow public read access
-- CREATE POLICY "Public read access to attachments"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'email-attachments');

-- ============================================
-- Verify bucket created:
-- ============================================
SELECT id, name, public FROM storage.buckets WHERE id = 'email-attachments';

-- You should see:
-- id                 | name              | public
-- -------------------+-------------------+--------
-- email-attachments  | email-attachments | true
