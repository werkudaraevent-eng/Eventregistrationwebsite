-- Add include_qr_code column to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS include_qr_code BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN email_templates.include_qr_code IS 'Whether to include participant QR code as attachment when sending email';

-- Set default to false for existing records
UPDATE email_templates SET include_qr_code = false WHERE include_qr_code IS NULL;
