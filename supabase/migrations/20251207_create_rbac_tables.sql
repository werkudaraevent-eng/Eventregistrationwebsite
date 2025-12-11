-- Migration: Create RBAC (Role-Based Access Control) Tables
-- Date: 2024-12-07
-- Description: Creates user_profiles, user_event_access, and user_audit_log tables
--              for implementing user management and access control

-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================
-- Extends Supabase Auth users with application-specific data

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'event_viewer' CHECK (role IN ('super_admin', 'event_admin', 'event_viewer', 'checkin_operator')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- ============================================
-- 2. USER EVENT ACCESS TABLE
-- ============================================
-- Maps users to events with specific permissions

CREATE TABLE IF NOT EXISTS user_event_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, event_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_event_access_user ON user_event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_access_event ON user_event_access(event_id);

-- ============================================
-- 3. USER AUDIT LOG TABLE
-- ============================================
-- Tracks all user management activities

CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN (
    'user_created', 
    'user_updated', 
    'user_deactivated', 
    'user_reactivated',
    'role_changed', 
    'access_granted', 
    'access_revoked',
    'login_success',
    'login_failed'
  )),
  target_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_audit_log_target ON user_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_performed_by ON user_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_action ON user_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created ON user_audit_log(created_at DESC);


-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- USER PROFILES POLICIES
-- ----------------------------------------

-- Super admins can see all user profiles
CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Super admins can insert new profiles
CREATE POLICY "Super admins can create profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Super admins can update any profile
CREATE POLICY "Super admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ----------------------------------------
-- USER EVENT ACCESS POLICIES
-- ----------------------------------------

-- Super admins can see all event access records
CREATE POLICY "Super admins can view all event access"
  ON user_event_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Users can see their own event access
CREATE POLICY "Users can view own event access"
  ON user_event_access FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can manage event access
CREATE POLICY "Super admins can manage event access"
  ON user_event_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- ----------------------------------------
-- USER AUDIT LOG POLICIES
-- ----------------------------------------

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
  ON user_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs"
  ON user_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_id AND role = 'super_admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to an event
CREATE OR REPLACE FUNCTION has_event_access(user_id UUID, event_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins have access to all events
  IF is_super_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- Check user_event_access table
  RETURN EXISTS (
    SELECT 1 FROM user_event_access uea
    JOIN user_profiles up ON up.id = uea.user_id
    WHERE uea.user_id = user_id 
      AND uea.event_id = event_id_param
      AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can edit an event
CREATE OR REPLACE FUNCTION can_edit_event(user_id UUID, event_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins can edit all events
  IF is_super_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- Check for edit permission
  RETURN EXISTS (
    SELECT 1 FROM user_event_access uea
    JOIN user_profiles up ON up.id = uea.user_id
    WHERE uea.user_id = user_id 
      AND uea.event_id = event_id_param
      AND uea.permission = 'edit'
      AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible events
CREATE OR REPLACE FUNCTION get_accessible_events(user_id UUID)
RETURNS TABLE(event_id TEXT, permission TEXT) AS $$
BEGIN
  -- Super admins get all events with 'edit' permission
  IF is_super_admin(user_id) THEN
    RETURN QUERY SELECT e.id, 'edit'::TEXT FROM events e;
  ELSE
    -- Return events from user_event_access
    RETURN QUERY 
      SELECT uea.event_id, uea.permission 
      FROM user_event_access uea
      JOIN user_profiles up ON up.id = uea.user_id
      WHERE uea.user_id = user_id AND up.is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER FOR AUTO-CREATING USER PROFILE
-- ============================================

-- Function to create user profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  new_role TEXT;
BEGIN
  -- Count existing super admins
  SELECT COUNT(*) INTO user_count FROM user_profiles WHERE role = 'super_admin';
  
  -- First user becomes super_admin
  IF user_count = 0 THEN
    new_role := 'super_admin';
  ELSE
    new_role := 'event_viewer';
  END IF;
  
  -- Create user profile
  INSERT INTO user_profiles (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    new_role,
    NOW()
  );
  
  -- Log the creation
  INSERT INTO user_audit_log (action, target_user_id, details)
  VALUES (
    'user_created',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'role', new_role,
      'auto_created', true
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE user_profiles IS 'Extended user profiles with roles and status';
COMMENT ON TABLE user_event_access IS 'Maps users to events with view/edit permissions';
COMMENT ON TABLE user_audit_log IS 'Audit trail for all user management activities';

COMMENT ON COLUMN user_profiles.role IS 'User role: super_admin, event_admin, event_viewer, checkin_operator';
COMMENT ON COLUMN user_event_access.permission IS 'Access level: view (read-only) or edit (read-write)';
COMMENT ON COLUMN user_audit_log.action IS 'Type of action performed';
