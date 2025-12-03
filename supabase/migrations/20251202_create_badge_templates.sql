-- Create badge_templates table for storing multiple badge templates per event
CREATE TABLE IF NOT EXISTS badge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_badge_templates_event_id ON badge_templates(event_id);

-- Enable RLS
ALTER TABLE badge_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view badge templates for their events"
  ON badge_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can insert badge templates"
  ON badge_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update badge templates"
  ON badge_templates FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete badge templates"
  ON badge_templates FOR DELETE
  USING (true);

-- Function to ensure only one default template per event
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE badge_templates 
    SET is_default = false 
    WHERE event_id = NEW.event_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default
DROP TRIGGER IF EXISTS trigger_single_default_template ON badge_templates;
CREATE TRIGGER trigger_single_default_template
  BEFORE INSERT OR UPDATE ON badge_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_badge_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_badge_template_timestamp ON badge_templates;
CREATE TRIGGER trigger_update_badge_template_timestamp
  BEFORE UPDATE ON badge_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_badge_template_timestamp();
