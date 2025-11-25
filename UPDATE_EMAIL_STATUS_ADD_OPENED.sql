-- Update email_status constraint to include 'opened' status
ALTER TABLE participants 
DROP CONSTRAINT IF EXISTS participants_email_status_check;

ALTER TABLE participants 
ADD CONSTRAINT participants_email_status_check 
CHECK (email_status IN ('not_sent', 'sent', 'failed', 'pending', 'opened'));

-- Update email_logs status constraint to ensure 'opened' is valid
ALTER TABLE email_logs 
DROP CONSTRAINT IF EXISTS email_logs_status_check;

ALTER TABLE email_logs 
ADD CONSTRAINT email_logs_status_check 
CHECK (status IN ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened', 'clicked'));

-- Update comment
COMMENT ON COLUMN participants.email_status IS 'Current email delivery status: not_sent, sent, failed, pending, opened';
COMMENT ON COLUMN email_logs.status IS 'Email delivery status: sent, failed, pending, bounced, delivered, opened, clicked';

-- Verify constraints
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%email%status%';
