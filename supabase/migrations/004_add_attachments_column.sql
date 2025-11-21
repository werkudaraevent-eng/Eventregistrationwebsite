-- Add attachments column to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS attachments TEXT[];

-- Add comment
COMMENT ON COLUMN email_templates.attachments IS 'Array of attachment file URLs from Supabase Storage';

-- Create storage bucket for email attachments
-- Note: This might need to be run separately in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('email-attachments', 'email-attachments', true)
-- ON CONFLICT (id) DO NOTHING;
