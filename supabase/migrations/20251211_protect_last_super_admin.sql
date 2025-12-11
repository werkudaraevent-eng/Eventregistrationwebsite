-- Protect against deactivating the last super admin (TOCTOU race condition fix)
-- This trigger runs at the database level, ensuring atomicity

CREATE OR REPLACE FUNCTION check_last_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we're deactivating a super admin
  IF NEW.is_active = false AND OLD.is_active = true AND OLD.role = 'super_admin' THEN
    IF (SELECT COUNT(*) FROM user_profiles WHERE role = 'super_admin' AND is_active = true AND id != OLD.id) < 1 THEN
      RAISE EXCEPTION 'Cannot deactivate the last super admin';
    END IF;
  END IF;
  
  -- Check if we're demoting the last super admin
  IF NEW.role != 'super_admin' AND OLD.role = 'super_admin' AND OLD.is_active = true THEN
    IF (SELECT COUNT(*) FROM user_profiles WHERE role = 'super_admin' AND is_active = true AND id != OLD.id) < 1 THEN
      RAISE EXCEPTION 'Cannot demote the last super admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS protect_last_super_admin ON user_profiles;

-- Create the trigger
CREATE TRIGGER protect_last_super_admin
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_last_super_admin();
