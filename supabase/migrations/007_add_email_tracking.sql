-- =====================================================
-- Email Tracking System - Database Schema
-- =====================================================
-- This migration adds email tracking capabilities to the system
-- Tracks email status per participant and maintains full email history

-- =====================================================
-- Add Email Tracking Columns to Participants Table
-- =====================================================

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'not_sent' CHECK (email_status IN ('not_sent', 'sent', 'failed', 'pending')),
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_email_template_id UUID,
ADD COLUMN IF NOT EXISTS email_send_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_last_error TEXT;

-- Add index for faster email status queries
CREATE INDEX IF NOT EXISTS idx_participants_email_status ON participants(email_status);
CREATE INDEX IF NOT EXISTS idx_participants_last_sent ON participants(last_email_sent_at);

-- Add comments
COMMENT ON COLUMN participants.email_status IS 'Current email delivery status: not_sent, sent, failed, pending';
COMMENT ON COLUMN participants.last_email_sent_at IS 'Timestamp of last email sent to this participant';
COMMENT ON COLUMN participants.last_email_template_id IS 'Reference to last email template used';
COMMENT ON COLUMN participants.email_send_count IS 'Total number of emails sent to this participant';
COMMENT ON COLUMN participants.email_last_error IS 'Last error message if email sending failed';

-- =====================================================
-- Create Email Logs Table
-- =====================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened', 'clicked')),
  error_message TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_participant ON email_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Enable Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - adjust based on your auth setup)
CREATE POLICY "Allow all operations on email_logs" ON email_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE email_logs IS 'Complete history of all emails sent to participants';

-- =====================================================
-- Create Email Statistics View
-- =====================================================

CREATE OR REPLACE VIEW email_statistics AS
SELECT 
  COUNT(*) FILTER (WHERE email_status = 'sent') as total_sent,
  COUNT(*) FILTER (WHERE email_status = 'failed') as total_failed,
  COUNT(*) FILTER (WHERE email_status = 'pending') as total_pending,
  COUNT(*) FILTER (WHERE email_status = 'not_sent') as total_not_sent,
  COUNT(*) as total_participants,
  ROUND(
    (COUNT(*) FILTER (WHERE email_status = 'sent')::numeric / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as delivery_rate,
  MAX(last_email_sent_at) as last_email_sent
FROM participants;

COMMENT ON VIEW email_statistics IS 'Aggregated email statistics across all participants';

-- =====================================================
-- Create Function to Update Email Status
-- =====================================================

CREATE OR REPLACE FUNCTION update_participant_email_status(
  p_participant_id TEXT,
  p_template_id UUID,
  p_template_name TEXT,
  p_subject TEXT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update participant status
  UPDATE participants
  SET 
    email_status = p_status,
    last_email_sent_at = NOW(),
    last_email_template_id = p_template_id,
    email_send_count = email_send_count + 1,
    email_last_error = p_error_message
  WHERE id = p_participant_id;
  
  -- Insert log entry
  INSERT INTO email_logs (
    participant_id,
    template_id,
    template_name,
    subject,
    status,
    error_message
  ) VALUES (
    p_participant_id,
    p_template_id,
    p_template_name,
    p_subject,
    p_status,
    p_error_message
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_participant_email_status IS 'Updates participant email status and creates log entry';

-- =====================================================
-- Sample Data (Optional - Remove in production)
-- =====================================================

-- This is just for testing - remove this section in production
-- UPDATE participants 
-- SET email_status = 'sent', 
--     last_email_sent_at = NOW() - INTERVAL '2 hours',
--     email_send_count = 1
-- WHERE id IN (SELECT id FROM participants LIMIT 3);
