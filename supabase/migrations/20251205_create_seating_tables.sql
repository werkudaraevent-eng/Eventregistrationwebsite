-- Seating Arrangement Tables
-- Supports table-based seating with multiple layouts per event

-- Seating Layouts (can have multiple per event, e.g., different sessions)
CREATE TABLE IF NOT EXISTS seating_layouts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agenda_id TEXT, -- Optional link to agenda (no FK constraint)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables within a layout
CREATE TABLE IF NOT EXISTS seating_tables (
  id TEXT PRIMARY KEY,
  layout_id TEXT NOT NULL REFERENCES seating_layouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  table_type TEXT DEFAULT 'round', -- 'round', 'rectangle', 'custom'
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seat assignments (links participants to seats)
CREATE TABLE IF NOT EXISTS seat_assignments (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  label TEXT, -- Optional label like "Reserved", "VIP"
  is_blocked BOOLEAN DEFAULT false, -- Block seat from being assigned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, seat_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seating_layouts_event ON seating_layouts(event_id);
CREATE INDEX IF NOT EXISTS idx_seating_tables_layout ON seating_tables(layout_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_table ON seat_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_participant ON seat_assignments(participant_id);

-- Enable RLS
ALTER TABLE seating_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users - adjust as needed)
CREATE POLICY "Allow all for seating_layouts" ON seating_layouts FOR ALL USING (true);
CREATE POLICY "Allow all for seating_tables" ON seating_tables FOR ALL USING (true);
CREATE POLICY "Allow all for seat_assignments" ON seat_assignments FOR ALL USING (true);
