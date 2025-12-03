-- Add Gmail columns to existing email_config table
ALTER TABLE email_config 
ADD COLUMN IF NOT EXISTS gmail_email TEXT,
ADD COLUMN IF NOT EXISTS gmail_app_password TEXT;

-- Update provider comment
COMMENT ON COLUMN email_config.provider IS 'Email provider: gmail, smtp, sendgrid, mailgun';

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_config' 
AND column_name IN ('gmail_email', 'gmail_app_password');

-- Show current data
SELECT id, provider, gmail_email, sender_email FROM email_config;
