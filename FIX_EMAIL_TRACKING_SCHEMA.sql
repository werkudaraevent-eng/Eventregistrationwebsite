-- =====================================================
-- FIX: Add Email Tracking Columns to Participants Table
-- =====================================================
-- This adds all missing email tracking columns

-- Step 1: Add email tracking columns to participants table
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'not_sent',
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_email_template_id UUID,
ADD COLUMN IF NOT EXISTS email_send_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_last_error TEXT;

-- Step 2: Add constraint for email_status (with 'opened' status)
ALTER TABLE participants 
DROP CONSTRAINT IF EXISTS participants_email_status_check;

ALTER TABLE participants 
ADD CONSTRAINT participants_email_status_check 
CHECK (email_status IN ('not_sent', 'sent', 'failed', 'pending', 'opened'));

-- Step 3: Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_participants_email_status ON participants(email_status);
CREATE INDEX IF NOT EXISTS idx_participants_last_sent ON participants(last_email_sent_at);

-- Step 4: Add comments
COMMENT ON COLUMN participants.email_status IS 'Current email delivery status: not_sent, sent, failed, pending, opened';
COMMENT ON COLUMN participants.last_email_sent_at IS 'Timestamp of last email sent to this participant';
COMMENT ON COLUMN participants.last_email_template_id IS 'Reference to last email template used';
COMMENT ON COLUMN participants.email_send_count IS 'Total number of emails sent to this participant';
COMMENT ON COLUMN participants.email_last_error IS 'Last error message if email sending failed';

-- =====================================================
-- Verify Email Logs Table
-- =====================================================

-- Check if email_logs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'email_logs'
);

-- If email_logs doesn't exist, create it
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Update email_logs status constraint
ALTER TABLE email_logs 
DROP CONSTRAINT IF EXISTS email_logs_status_check;

ALTER TABLE email_logs 
ADD CONSTRAINT email_logs_status_check 
CHECK (status IN ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened', 'clicked'));

-- Add indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_participant ON email_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Enable Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Allow all operations on email_logs" ON email_logs;

-- Create policy (allow all operations for now)
CREATE POLICY "Allow all operations on email_logs" ON email_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE email_logs IS 'Complete history of all emails sent to participants';
COMMENT ON COLUMN email_logs.status IS 'Email delivery status: sent, failed, pending, bounced, delivered, opened, clicked';

-- =====================================================
-- Verify Installation
-- =====================================================

-- Check participants columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'participants' 
  AND column_name IN ('email_status', 'last_email_sent_at', 'email_send_count');

-- Check email_logs table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'email_logs'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%email%status%';

-- Success message
SELECT 'Email tracking schema installed successfully!' as status;
