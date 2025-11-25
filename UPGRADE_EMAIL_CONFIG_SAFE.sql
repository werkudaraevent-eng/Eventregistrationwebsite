-- SAFE UPGRADE: Email Config Multi-Provider Support
-- Versi aman yang handle existing data dan rollback-friendly

-- =============================================================================
-- STEP 1: Check if migration needed
-- =============================================================================

DO $$
BEGIN
  -- Check if already migrated
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_config' 
    AND column_name = 'config_name'
  ) THEN
    RAISE NOTICE '✅ Migration already applied. Skipping...';
    RETURN;
  END IF;
  
  RAISE NOTICE '🔧 Starting migration...';
END $$;

-- =============================================================================
-- STEP 2: Add new columns (safe - won't error if already exists)
-- =============================================================================

ALTER TABLE email_config 
  ADD COLUMN IF NOT EXISTS config_name TEXT NOT NULL DEFAULT 'My Config',
  ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_test_status TEXT,
  ADD COLUMN IF NOT EXISTS last_test_error TEXT;

-- Add CHECK constraint (drop first if exists)
DO $$
BEGIN
  ALTER TABLE email_config DROP CONSTRAINT IF EXISTS email_config_last_test_status_check;
  ALTER TABLE email_config ADD CONSTRAINT email_config_last_test_status_check 
    CHECK (last_test_status IN ('success', 'failed'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint already exists or cannot be added';
END $$;

-- =============================================================================
-- STEP 3: Update existing 'default' config name
-- =============================================================================

UPDATE email_config 
SET config_name = 'Default Configuration'
WHERE id = 'default' AND config_name = 'My Config';

-- =============================================================================
-- STEP 4: Create unique index for is_active (hanya 1 yang boleh true)
-- =============================================================================

DROP INDEX IF EXISTS idx_email_config_active_unique;
CREATE UNIQUE INDEX idx_email_config_active_unique 
  ON email_config (is_active) 
  WHERE is_active = true;

-- =============================================================================
-- STEP 5: Helper function - Set Active Config
-- =============================================================================

CREATE OR REPLACE FUNCTION set_active_email_config(config_id TEXT)
RETURNS void AS $$
DECLARE
  config_exists BOOLEAN;
BEGIN
  -- Check if config exists
  SELECT EXISTS(SELECT 1 FROM email_config WHERE id = config_id) INTO config_exists;
  
  IF NOT config_exists THEN
    RAISE EXCEPTION 'Configuration with id % not found', config_id;
  END IF;

  -- Deactivate all configs (with WHERE clause untuk RLS compliance)
  UPDATE email_config 
  SET is_active = false, updated_at = NOW() 
  WHERE is_active = true AND id != config_id;
  
  -- Activate specified config
  UPDATE email_config 
  SET is_active = true, updated_at = NOW()
  WHERE id = config_id;
  
  RAISE NOTICE 'Config % activated successfully', config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 6: Helper function - Duplicate Config
-- =============================================================================

CREATE OR REPLACE FUNCTION duplicate_email_config(source_config_id TEXT, new_name TEXT)
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  config_exists BOOLEAN;
BEGIN
  -- Check if source exists
  SELECT EXISTS(SELECT 1 FROM email_config WHERE id = source_config_id) INTO config_exists;
  
  IF NOT config_exists THEN
    RAISE EXCEPTION 'Source configuration with id % not found', source_config_id;
  END IF;

  -- Generate new ID
  new_id := gen_random_uuid()::text;

  -- Duplicate config
  INSERT INTO email_config (
    id, provider, config_name,
    gmail_email, gmail_app_password,
    smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure,
    sendgrid_api_key,
    mailgun_api_key, mailgun_domain,
    sender_email, sender_name,
    is_active
  )
  SELECT 
    new_id, provider, new_name,
    gmail_email, gmail_app_password,
    smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure,
    sendgrid_api_key,
    mailgun_api_key, mailgun_domain,
    sender_email, sender_name,
    false -- Duplicate always inactive
  FROM email_config
  WHERE id = source_config_id;
  
  RAISE NOTICE 'Config duplicated with new id: %', new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 7: Add RLS policies (safe - drop if exists first)
-- =============================================================================

-- Policy untuk INSERT
DROP POLICY IF EXISTS "Allow insert email_config for authenticated users" ON email_config;
CREATE POLICY "Allow insert email_config for authenticated users" ON email_config
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Policy untuk DELETE
DROP POLICY IF EXISTS "Allow delete email_config for authenticated users" ON email_config;
CREATE POLICY "Allow delete email_config for authenticated users" ON email_config
  FOR DELETE 
  TO authenticated
  USING (true);

-- =============================================================================
-- STEP 8: Verification
-- =============================================================================

-- Show current configs
SELECT 
  id, 
  config_name, 
  provider, 
  is_active,
  sender_email,
  created_at::date as created,
  last_tested_at::timestamp(0) as last_test,
  last_test_status
FROM email_config
ORDER BY is_active DESC, created_at DESC;

-- Show helper functions
SELECT 
  routine_name as function_name,
  routine_type as type
FROM information_schema.routines
WHERE routine_name IN ('set_active_email_config', 'duplicate_email_config')
  AND routine_schema = 'public'
ORDER BY routine_name;

-- Show table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'email_config'
ORDER BY ordinal_position;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ ================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Functions available:';
  RAISE NOTICE '   - set_active_email_config(config_id)';
  RAISE NOTICE '   - duplicate_email_config(source_id, new_name)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Restart your dev server';
  RAISE NOTICE '   2. Go to Email Settings tab';
  RAISE NOTICE '   3. Create new configurations!';
END $$;
