# Supabase Setup Guide

## Database Tables Required

### 1. events table
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2. participants table
```sql
CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  position TEXT,
  registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  attendance JSONB DEFAULT '[]',
  custom_data JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_participants_email ON participants(email);

-- Enable RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON participants
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON participants
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON participants
  FOR DELETE USING (true);
```

## Steps to Setup:

1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Run the SQL scripts above to create tables
4. Make sure you have the following in your `.env.local`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Database Column Mapping

The application uses camelCase in TypeScript but the database uses snake_case:

- TypeScript: `eventId` → Database: `event_id`
- TypeScript: `registeredAt` → Database: `registered_at`
- TypeScript: `customData` → Database: `custom_data`
- TypeScript: `startDate` → Database: `start_date`
- TypeScript: `endDate` → Database: `end_date`

## Current Implementation Status

✅ **ParticipantManagement.tsx** - Now using Supabase:
- `handleAddParticipant()` - Insert new participant
- `fetchParticipants()` - Fetch all participants for event
- `handleDeleteParticipant()` - Delete participant
- `handleImportCSV()` - Bulk import from CSV

### Data Format for Insert

```javascript
{
  id: "part_${timestamp}_${random}",
  event_id: eventId,
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  company: "Acme Corp",
  position: "Engineer",
  registered_at: "2025-11-06T10:30:00Z",
  attendance: [],
  custom_data: {}
}
```

## Testing

1. Create an event via Event Management
2. Go to Participants tab
3. Click "Add Participant"
4. Fill in form and submit
5. Participant should appear in table (fetched from Supabase)
