# Setup Supabase Database

## Quick Start: Copy & Paste to Supabase SQL Editor

**⚠️ IMPORTANT: Only run the SQL script below ONCE. It contains ALL tables (events, participants, agenda_items).**

Go to your Supabase project dashboard → SQL Editor → New Query, then copy dan paste seluruh script di bawah ini:

---

```sql
-- =====================================================
-- Event Registration System - Complete Database Setup
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

-- Index untuk faster lookups
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

-- Indexes untuk faster queries
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

-- Indexes untuk faster queries
CREATE INDEX IF NOT EXISTS idx_agenda_items_event_id ON agenda_items("eventId");
CREATE INDEX IF NOT EXISTS idx_agenda_items_start_time ON agenda_items("startTime");

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Public read access for events" ON events;
DROP POLICY IF EXISTS "Public read access for participants" ON participants;
DROP POLICY IF EXISTS "Public read access for agenda_items" ON agenda_items;
DROP POLICY IF EXISTS "Public insert access for participants" ON participants;
DROP POLICY IF EXISTS "Public update access for participants" ON participants;
DROP POLICY IF EXISTS "Public manage events" ON events;
DROP POLICY IF EXISTS "Public manage agenda_items" ON agenda_items;
DROP POLICY IF EXISTS "Public delete participants" ON participants;

-- Public read access for all tables
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

-- Public manage events
CREATE POLICY "Public manage events"
    ON events FOR ALL
    USING (true);

-- Public manage agenda_items
CREATE POLICY "Public manage agenda_items"
    ON agenda_items FOR ALL
    USING (true);

-- Public delete participants
CREATE POLICY "Public delete participants"
    ON participants FOR DELETE
    USING (true);
```

---

## Steps to Execute:

1. **Login to Supabase** → Project Dashboard
2. **Go to SQL Editor** (left sidebar)
3. **Click "New Query"**
4. **Paste entire SQL script above**
5. **Click "Run"** (green play button)
6. **Verify tables created** → Go to Database → Tables section

## Verify Tables Were Created:

You should see these tables:
- ✅ `events`
- ✅ `participants`
- ✅ `agenda_items`

## Environment Configuration

Make sure your `.env.local` has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these in Supabase → Project Settings → API

## Testing the Setup

1. **Create Event**: Go to http://localhost:3001 → Create Event (makan, 06/11/2025, 20/11/2025, jkt, jkt)
2. **Add Participant**: Click on event → Participants tab → "Add Participant"
3. **Check Console**: Should see `[SUPABASE] Adding participant` log message
4. **Verify**: Participant should appear in table

## Troubleshooting

### Error: "relation 'events' does not exist"
→ SQL script hasn't been executed. Go to Supabase SQL Editor and run the script above.

### Error: "null value in column 'startDate' violates not-null constraint"
→ Database already created but with different schema. Drop tables and run script again:

```sql
DROP TABLE IF EXISTS agenda_items CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS events CASCADE;
```

Then run the full script above.

### Error: "RLS violation"
→ RLS policies need to be updated. Re-run the RLS section above.

### Error: "column participants.event_id does not exist"
→ Column name mismatch! Database uses camelCase: `eventId` (not `event_id`)
→ Code has been updated to use correct camelCase column names
→ Make sure you're running the latest ParticipantManagement.tsx code

## Data Flow

```
Event Creation (EventSelection.tsx)
    ↓ INSERT into events table
    ↓
Event Displayed
    ↓
User Adds Participant (ParticipantManagement.tsx)
    ↓ INSERT into participants table
    ↓
Participant Appears in Table
```

## Column Naming Convention

Database uses camelCase (same as TypeScript) for this project:
- `startDate`, `endDate` (not snake_case)
- `eventId`, `registeredAt`
- `customData`, `customFields`

This matches the Supabase migration file exactly.
