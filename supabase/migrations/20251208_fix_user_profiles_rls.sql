-- Migration: Fix infinite recursion in user_profiles RLS policies
-- Date: 2024-12-08
-- Description: Fixes the infinite recursion issue by using SECURITY DEFINER functions
--              that bypass RLS when checking user roles

-- ============================================
-- 1. CREATE HELPER FUNCTION (SECURITY DEFINER)
-- ============================================
-- This function bypasses RLS to check user role without triggering policy recursion

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 2. DROP EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can create profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Super admins can view all event access" ON user_event_access;
DROP POLICY IF EXISTS "Users can view own event access" ON user_event_access;
DROP POLICY IF EXISTS "Super admins can manage event access" ON user_event_access;

DROP POLICY IF EXISTS "Super admins can view audit logs" ON user_audit_log;

-- ============================================
-- 3. RECREATE USER PROFILES POLICIES (FIXED)
-- ============================================

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Super admins can see all user profiles (using SECURITY DEFINER function)
CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Super admins can insert new profiles
CREATE POLICY "Super admins can create profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

-- Allow first user to create their own profile (for initial setup)
CREATE POLICY "Allow self profile creation"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Super admins can update any profile
CREATE POLICY "Super admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Users can update their own profile (limited fields handled in app)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- 4. RECREATE USER EVENT ACCESS POLICIES (FIXED)
-- ============================================

-- Users can see their own event access
CREATE POLICY "Users can view own event access"
  ON user_event_access FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can see all event access records
CREATE POLICY "Super admins can view all event access"
  ON user_event_access FOR SELECT
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Super admins can insert event access
CREATE POLICY "Super admins can insert event access"
  ON user_event_access FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

-- Super admins can update event access
CREATE POLICY "Super admins can update event access"
  ON user_event_access FOR UPDATE
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Super admins can delete event access
CREATE POLICY "Super admins can delete event access"
  ON user_event_access FOR DELETE
  USING (get_user_role(auth.uid()) = 'super_admin');

-- ============================================
-- 5. RECREATE AUDIT LOG POLICIES (FIXED)
-- ============================================

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
  ON user_audit_log FOR SELECT
  USING (get_user_role(auth.uid()) = 'super_admin');

-- System can insert audit logs (via service role or trigger)
-- Use IF NOT EXISTS pattern via DO block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_audit_log' 
    AND policyname = 'System can insert audit logs'
  ) THEN
    CREATE POLICY "System can insert audit logs"
      ON user_audit_log FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
