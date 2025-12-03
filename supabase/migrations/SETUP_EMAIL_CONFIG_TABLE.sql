-- Check if email_config table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'email_config'
);

-- If false, run this:
-- Create table for email configuration
CREATE TABLE IF NOT EXISTS email_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  provider TEXT NOT NULL DEFAULT 'smtp',
  
  -- SMTP Settings
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  smtp_secure BOOLEAN DEFAULT false,
  
  -- SendGrid Settings
  sendgrid_api_key TEXT,
  
  -- Gmail OAuth (future)
  gmail_client_id TEXT,
  gmail_client_secret TEXT,
  gmail_refresh_token TEXT,
  
  -- Mailgun Settings
  mailgun_api_key TEXT,
  mailgun_domain TEXT,
  
  -- General Settings
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'Event Registration System',
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO email_config (id, provider, sender_email, sender_name)
VALUES ('default', 'smtp', 'noreply@yourdomain.com', 'Event Registration System')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read email_config" ON email_config;
DROP POLICY IF EXISTS "Allow update email_config for authenticated users" ON email_config;

-- Policy: Anyone can read email config (needed for edge function)
CREATE POLICY "Allow read email_config" ON email_config
  FOR SELECT USING (true);

-- Policy: Only authenticated users can update
CREATE POLICY "Allow update email_config for authenticated users" ON email_config
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Drop trigger first (before function)
DROP TRIGGER IF EXISTS email_config_updated_at ON email_config;

-- Drop function if exists (CASCADE will drop dependent objects)
DROP FUNCTION IF EXISTS update_email_config_updated_at() CASCADE;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER email_config_updated_at
  BEFORE UPDATE ON email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_email_config_updated_at();
