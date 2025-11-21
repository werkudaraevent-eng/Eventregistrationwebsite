-- Add badge_template column to events table for badge designer
-- This stores the designed badge template with component layouts and styling

ALTER TABLE events ADD COLUMN IF NOT EXISTS badge_template JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN events.badge_template IS 'Badge template configuration with component layouts, styling, and badge size settings. Structure: {size, customWidth, customHeight, backgroundColor, backgroundImageUrl, backgroundImageFit, logoUrl, components[]}';
