-- =====================================================
-- Create Email Tracking/History Table
-- =====================================================
-- This table stores all email sending history including:
-- - Blast campaigns
-- - Test emails
-- - Registration confirmation emails
-- - Individual emails

-- Step 1: Create participant_emails table
CREATE TABLE IF NOT EXISTS participant_emails (
  id TEXT PRIMARY KEY DEFAULT 'EM' || to_char(extract(epoch from now()) * 1000, 'FM0000000000000') || upper(substring(md5(random()::text) from 1 for 4)),
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'opened', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participant_emails_participant_id ON participant_emails(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_emails_template_id ON participant_emails(template_id);
CREATE INDEX IF NOT EXISTS idx_participant_emails_campaign_id ON participant_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_participant_emails_status ON participant_emails(status);
CREATE INDEX IF NOT EXISTS idx_participant_emails_sent_at ON participant_emails(sent_at DESC);

-- Step 3: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_participant_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participant_emails_updated_at
  BEFORE UPDATE ON participant_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_emails_updated_at();

-- Step 4: Add comments
COMMENT ON TABLE participant_emails IS 'Email sending history for participants including blast campaigns, confirmations, and individual emails';
COMMENT ON COLUMN participant_emails.id IS 'Unique email log ID with EM prefix';
COMMENT ON COLUMN participant_emails.participant_id IS 'Reference to participant who received the email';
COMMENT ON COLUMN participant_emails.template_id IS 'Reference to email template used (nullable for legacy/deleted templates)';
COMMENT ON COLUMN participant_emails.template_name IS 'Template name snapshot at time of sending';
COMMENT ON COLUMN participant_emails.campaign_id IS 'Reference to blast campaign if email was part of a campaign (nullable for individual/confirmation emails)';
COMMENT ON COLUMN participant_emails.subject IS 'Email subject line';
COMMENT ON COLUMN participant_emails.status IS 'Email status: pending, sent, failed, opened, clicked';
COMMENT ON COLUMN participant_emails.error_message IS 'Error message if send failed';
COMMENT ON COLUMN participant_emails.sent_at IS 'Timestamp when email was sent/attempted';
COMMENT ON COLUMN participant_emails.opened_at IS 'Timestamp when email was first opened (via tracking pixel)';
COMMENT ON COLUMN participant_emails.clicked_at IS 'Timestamp when any link in email was clicked';

-- Step 5: Enable Row Level Security (optional, adjust as needed)
ALTER TABLE participant_emails ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view all emails
CREATE POLICY "Allow authenticated users to view participant emails"
  ON participant_emails
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for service role to insert/update emails
CREATE POLICY "Allow service role to manage participant emails"
  ON participant_emails
  FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- Verify Installation
-- =====================================================

-- Check table was created
SELECT 
  table_name, 
  (SELECT count(*) FROM participant_emails) as row_count
FROM information_schema.tables
WHERE table_name = 'participant_emails';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'participant_emails'
ORDER BY indexname;

-- Success message
SELECT '✅ participant_emails table created successfully!' as status;
SELECT '✅ Use EmailHistory component in AdminDashboard to view email logs' as next_step;
