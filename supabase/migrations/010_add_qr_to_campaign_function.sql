-- Update get_campaign_participants function to include qr_code_url
-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS get_campaign_participants(text, text, jsonb, text[]);

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
  "position" TEXT,
  qr_code_url TEXT
) AS $$
BEGIN
  -- Manual selection
  IF p_target_type = 'manual' THEN
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position", p.qr_code_url
    FROM participants p
    WHERE p."eventId" = p_event_id
      AND p.id = ANY(p_target_participant_ids);
  
  -- Filtered selection
  ELSIF p_target_type = 'filtered' THEN
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position", p.qr_code_url
    FROM participants p
    WHERE p."eventId" = p_event_id
      AND (
        (p_target_filter->>'company' IS NULL OR p.company = p_target_filter->>'company')
        AND (p_target_filter->>'position' IS NULL OR p."position" = p_target_filter->>'position')
      );
  
  -- All participants
  ELSE
    RETURN QUERY
    SELECT p.id, p.name, p.email, p.phone, p.company, p."position", p.qr_code_url
    FROM participants p
    WHERE p."eventId" = p_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_campaign_participants IS 'Get list of participants with QR codes based on campaign targeting rules';
