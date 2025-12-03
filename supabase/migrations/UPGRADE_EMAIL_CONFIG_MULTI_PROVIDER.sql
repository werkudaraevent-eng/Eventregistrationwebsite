-- Upgrade email_config untuk support multiple provider configurations
-- User bisa menyimpan beberapa konfigurasi dan switch mana yang aktif

-- 1. Alter table structure
-- Ubah id dari 'default' menjadi auto-generated UUID untuk multiple entries
-- Tambahkan name untuk identifier yang user-friendly
-- Tambahkan last_tested_at untuk tracking kapan terakhir di-test

ALTER TABLE email_config 
  DROP CONSTRAINT IF EXISTS email_config_pkey,
  ADD COLUMN IF NOT EXISTS config_name TEXT NOT NULL DEFAULT 'My Config',
  ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_test_status TEXT CHECK (last_test_status IN ('success', 'failed')),
  ADD COLUMN IF NOT EXISTS last_test_error TEXT;

-- Recreate primary key dengan UUID generator
ALTER TABLE email_config 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Tambahkan constraint: hanya boleh ada 1 config yang is_active = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_config_active_unique 
  ON email_config (is_active) 
  WHERE is_active = true;

-- 2. Migrate existing 'default' row jika ada
UPDATE email_config 
SET config_name = 'Default Configuration'
WHERE id = 'default';

-- 3. Create helper function untuk switch active config
CREATE OR REPLACE FUNCTION set_active_email_config(config_id TEXT)
RETURNS void AS $$
BEGIN
  -- Deactivate all configs (with WHERE clause to satisfy RLS)
  UPDATE email_config SET is_active = false WHERE is_active = true;
  
  -- Activate specified config
  UPDATE email_config 
  SET is_active = true, updated_at = NOW()
  WHERE id = config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function untuk duplicate config (useful untuk testing variants)
CREATE OR REPLACE FUNCTION duplicate_email_config(source_config_id TEXT, new_name TEXT)
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
BEGIN
  INSERT INTO email_config (
    provider, config_name,
    gmail_email, gmail_app_password,
    smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure,
    sendgrid_api_key,
    mailgun_api_key, mailgun_domain,
    sender_email, sender_name,
    is_active
  )
  SELECT 
    provider, new_name,
    gmail_email, gmail_app_password,
    smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure,
    sendgrid_api_key,
    mailgun_api_key, mailgun_domain,
    sender_email, sender_name,
    false -- Duplicate always inactive
  FROM email_config
  WHERE id = source_config_id
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add policy untuk insert (authenticated users can create new configs)
DROP POLICY IF EXISTS "Allow insert email_config for authenticated users" ON email_config;
CREATE POLICY "Allow insert email_config for authenticated users" ON email_config
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- 6. Add policy untuk delete (authenticated users can delete configs)
DROP POLICY IF EXISTS "Allow delete email_config for authenticated users" ON email_config;
CREATE POLICY "Allow delete email_config for authenticated users" ON email_config
  FOR DELETE 
  TO authenticated
  USING (true);

-- 7. Verify the upgrade
SELECT 
  id, 
  config_name, 
  provider, 
  is_active,
  sender_email,
  created_at,
  last_tested_at,
  last_test_status
FROM email_config
ORDER BY is_active DESC, created_at DESC;

-- 8. Show helper functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name LIKE '%email_config%'
  AND routine_schema = 'public'
ORDER BY routine_name;

SELECT '✅ Email config table upgraded untuk multi-provider support!' as status;
SELECT '📝 Use set_active_email_config(''config_id'') untuk switch active config' as tip;
SELECT '📝 Use duplicate_email_config(''source_id'', ''New Name'') untuk duplicate config' as tip2;
