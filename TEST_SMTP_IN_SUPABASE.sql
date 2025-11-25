-- Test SMTP Connection dari Supabase SQL Editor
-- Jalankan query ini untuk debug SMTP settings

-- 1. Check active config
SELECT 
  id,
  config_name,
  provider,
  smtp_host,
  smtp_port,
  smtp_username,
  LEFT(smtp_password, 3) || '***' as smtp_password_preview,
  smtp_secure,
  sender_email,
  sender_name,
  is_active
FROM email_config
WHERE is_active = true;

-- 2. Check ALL configs (untuk compare)
SELECT 
  id,
  config_name,
  provider,
  smtp_host,
  smtp_port,
  smtp_username,
  smtp_secure,
  is_active,
  created_at
FROM email_config
ORDER BY created_at DESC;

-- 3. Check if Gmail config works
SELECT 
  id,
  config_name,
  provider,
  gmail_email,
  LEFT(gmail_app_password, 3) || '***' as gmail_pass_preview,
  is_active
FROM email_config
WHERE provider = 'gmail';

-- ================================================================
-- TROUBLESHOOTING SMTP SETTINGS
-- ================================================================

-- Common SMTP Settings:

-- GMAIL:
-- smtp_host: smtp.gmail.com
-- smtp_port: 587
-- smtp_secure: false
-- smtp_username: your-email@gmail.com
-- smtp_password: your-16-char-app-password

-- CPANEL/HOSTING (uranus.webmail.co.id):
-- Option A - Port 465 (SSL):
--   smtp_port: 465
--   smtp_secure: true
-- Option B - Port 587 (TLS):
--   smtp_port: 587
--   smtp_secure: false

-- ================================================================
-- FIX: Update SMTP settings
-- ================================================================

-- OPTION 1: Fix existing SMTP config (uranus.webmail.co.id)
-- Ganti 'your-config-id-here' dengan ID dari query pertama di atas

/*
UPDATE email_config
SET 
  smtp_host = 'uranus.webmail.co.id',
  smtp_port = 465,  -- Atau 587
  smtp_secure = true,  -- true untuk 465, false untuk 587
  smtp_username = 'event@werkudaratravel.com',
  smtp_password = 'your-password-here',
  sender_email = 'event@werkudaratravel.com',
  sender_name = 'Event Registration System'
WHERE id = 'your-config-id-here';
*/

-- OPTION 2: Switch to Gmail (if you have it configured)
-- Ganti 'your-gmail-config-id' dengan ID dari query #3 di atas

/*
-- Deactivate SMTP
UPDATE email_config SET is_active = false WHERE provider = 'smtp';

-- Activate Gmail
UPDATE email_config SET is_active = true WHERE id = 'your-gmail-config-id';
*/

-- ================================================================
-- VERIFY AFTER UPDATE
-- ================================================================

SELECT 
  id,
  config_name,
  provider,
  smtp_host,
  smtp_port,
  smtp_secure,
  smtp_username,
  is_active,
  '✅ Config ready for testing' as status
FROM email_config
WHERE is_active = true;
