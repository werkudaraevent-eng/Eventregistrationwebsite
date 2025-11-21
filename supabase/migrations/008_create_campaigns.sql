-- Migration: Create campaigns table for Blast feature
-- Description: Campaign-based email/WhatsApp blasting system

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  template_name TEXT, -- Snapshot of template name
  template_subject TEXT, -- Snapshot for email templates
  
  -- Target configuration
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'filtered', 'manual')),
  target_filter JSONB DEFAULT '{}', -- {company: 'X', position: 'Y', email_status: 'not_sent'}
  target_participant_ids TEXT[] DEFAULT '{}', -- For manual selection
  
  -- Status and metrics
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_by TEXT, -- Admin user email
  notes TEXT
);

-- Add campaign_id to email_logs (run this after migration 007 is executed)
-- ALTER TABLE email_logs 
-- ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_event_id ON campaigns(event_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON email_logs(campaign_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Create view for campaign statistics
CREATE OR REPLACE VIEW campaign_statistics AS
SELECT 
  c.id as campaign_id,
  c.event_id,
  c.name as campaign_name,
  c.channel,
  c.status,
  c.total_recipients,
  c.sent_count,
  c.failed_count,
  c.pending_count,
  c.created_at,
  c.sent_at,
  c.completed_at,
  CASE 
    WHEN c.total_recipients > 0 
    THEN ROUND((c.sent_count::NUMERIC / c.total_recipients::NUMERIC) * 100, 2)
    ELSE 0 
  END as success_rate
FROM campaigns c;

-- Function to get target participants for a campaign
CREATE OR REPLACE FUNCTION get_campaign_participants(
  p_event_id TEXT,
  p_target_type TEXT,
  p_target_filter JSONB DEFAULT '{}',
  p_target_participant_ids TEXT[] DEFAULT '{}'
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  "position" TEXT
) AS $$
BEGIN
  -- Manual selection
  IF p_target_type = 'manual' THEN
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p
    WHERE p."eventId" = p_event_id
      AND p.id = ANY(p_target_participant_ids);
  
  -- Filtered selection
  ELSIF p_target_type = 'filtered' THEN
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p
    WHERE p."eventId" = p_event_id
      AND (
        (p_target_filter->>'company' IS NULL OR p.company = p_target_filter->>'company')
        AND (p_target_filter->>'position' IS NULL OR p."position" = p_target_filter->>'position')
      );
  
  -- All participants
  ELSE
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position"
    FROM participants p
    WHERE p."eventId" = p_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update campaign progress
CREATE OR REPLACE FUNCTION update_campaign_progress(
  p_campaign_id UUID,
  p_sent_increment INTEGER DEFAULT 0,
  p_failed_increment INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET 
    sent_count = sent_count + p_sent_increment,
    failed_count = failed_count + p_failed_increment,
    pending_count = total_recipients - (sent_count + p_sent_increment + failed_count + p_failed_increment),
    status = CASE 
      WHEN (sent_count + p_sent_increment + failed_count + p_failed_increment) >= total_recipients 
      THEN 'completed'
      ELSE status
    END,
    completed_at = CASE
      WHEN (sent_count + p_sent_increment + failed_count + p_failed_increment) >= total_recipients 
      THEN NOW()
      ELSE completed_at
    END
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
GRANT SELECT ON campaign_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_participants TO authenticated;
GRANT EXECUTE ON FUNCTION update_campaign_progress TO authenticated;

-- Add comment
COMMENT ON TABLE campaigns IS 'Campaign-based blast system for email and WhatsApp messaging';
COMMENT ON FUNCTION get_campaign_participants IS 'Get list of participants based on campaign targeting rules';
COMMENT ON FUNCTION update_campaign_progress IS 'Update campaign progress after sending emails';
