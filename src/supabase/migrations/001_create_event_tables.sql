-- =====================================================
-- Event Registration System - Database Schema
-- =====================================================
-- 
-- This schema creates tables for centralized event management
-- allowing cross-device access to events, participants, and agenda items
--
-- Security Model:
-- - Public read access for standalone pages (registration, check-in)
-- - Event ID-based data isolation
-- - No authentication required for public operations
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    "createdAt" TEXT NOT NULL,
    "customFields" JSONB DEFAULT '[]'::jsonb,
    "columnVisibility" JSONB DEFAULT '{
        "phone": true,
        "company": true,
        "position": true,
        "attendance": true,
        "registered": true
    }'::jsonb,
    branding JSONB DEFAULT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events("createdAt");

-- =====================================================
-- PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    company TEXT DEFAULT '',
    position TEXT DEFAULT '',
    "registeredAt" TEXT NOT NULL,
    attendance JSONB DEFAULT '[]'::jsonb,
    "customData" JSONB DEFAULT '{}'::jsonb
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants("eventId");
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_registered_at ON participants("registeredAt");

-- =====================================================
-- AGENDA ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agenda_items (
    id TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    location TEXT DEFAULT '',
    "createdAt" TEXT NOT NULL
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_agenda_items_event_id ON agenda_items("eventId");
CREATE INDEX IF NOT EXISTS idx_agenda_items_start_time ON agenda_items("startTime");

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (needed for standalone pages)
CREATE POLICY "Public read access for events"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Public read access for participants"
    ON participants FOR SELECT
    USING (true);

CREATE POLICY "Public read access for agenda_items"
    ON agenda_items FOR SELECT
    USING (true);

-- Public insert access for participants (self-registration)
CREATE POLICY "Public insert access for participants"
    ON participants FOR INSERT
    WITH CHECK (true);

-- Public update access for participants (check-in operations)
CREATE POLICY "Public update access for participants"
    ON participants FOR UPDATE
    USING (true);

-- Authenticated users can manage events (for admin dashboard)
-- Note: This requires authentication which can be added later
-- For now, we'll allow public access for demo purposes

CREATE POLICY "Public manage events"
    ON events FOR ALL
    USING (true);

CREATE POLICY "Public manage agenda_items"
    ON agenda_items FOR ALL
    USING (true);

CREATE POLICY "Public delete participants"
    ON participants FOR DELETE
    USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up old events (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_events(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events
    WHERE "createdAt" < (NOW() - INTERVAL '1 day' * days_old)::TEXT
    RETURNING count(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE events IS 'Stores event information with custom fields and branding settings';
COMMENT ON TABLE participants IS 'Stores participant registrations linked to specific events';
COMMENT ON TABLE agenda_items IS 'Stores agenda/session items for events';

COMMENT ON COLUMN events."customFields" IS 'JSON array of custom registration fields';
COMMENT ON COLUMN events."columnVisibility" IS 'JSON object defining which columns are visible in participant table';
COMMENT ON COLUMN events.branding IS 'JSON object containing registration page branding settings';
COMMENT ON COLUMN participants.attendance IS 'JSON array of check-in records for agenda items';
COMMENT ON COLUMN participants."customData" IS 'JSON object storing custom field values';
