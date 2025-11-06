# Architecture Fix: URL-Based Event Context

## Executive Summary

This document describes the critical architectural fix that resolves the "Event not found" error on standalone pages (registration forms, check-in dashboards) when accessed from different devices or browsers.

## The Problem

### Root Cause
The system was designed to use **browser-local storage (localStorage)** for all data persistence. This created a fundamental flaw:

```
Organizer Browser A (creates event) → localStorage → Event data stored locally
Public User Browser B (registration link) → localStorage → Empty! No event data!
Result: "Event not found" error
```

### Impact
1. **Registration links broken** - Public registration URLs don't work on other devices
2. **Check-in pages fail** - Standalone check-in dashboards can't access participant data
3. **No collaboration** - Multiple organizers can't work on the same event
4. **Session dependency** - Pages incorrectly relied on organizer session instead of URL context

## The Solution

### Architecture Change
Move from **browser-local storage** to **centralized database storage** using Supabase:

```
Any Device → URL with Event ID → Supabase Database → Event data retrieved
Result: Works everywhere!
```

### Key Principles

#### 1. URL-Based Context (Not Session-Based)
**Before:**
```typescript
// WRONG: Relies on session data
const eventId = localDB.getSelectedEventId(); // From organizer session
```

**After:**
```typescript
// RIGHT: Reads from URL
const eventId = props.eventId; // From URL parameter
```

#### 2. Event ID in Every URL
All standalone pages must include event context in the URL:

| Page Type | URL Format | Example |
|-----------|------------|---------|
| Registration | `#/register/{EVENT_ID}` | `#/register/E1730567890ABCD` |
| Check-In | `?checkin={AGENDA_ID}` | `?checkin=A1730567890123` |
| Admin Dashboard | Uses session (authenticated) | N/A |

#### 3. Data Scoped by Event ID
All database queries are filtered by event ID from URL:

```typescript
// Participants query
const participants = await supabase
  .from('participants')
  .select('*')
  .eq('eventId', eventIdFromUrl); // NOT from session!
```

## Implementation Details

### Database Schema

Three main tables with event-scoped foreign keys:

```sql
events (
  id TEXT PRIMARY KEY,
  name TEXT,
  -- ... other fields
)

participants (
  id TEXT PRIMARY KEY,
  eventId TEXT REFERENCES events(id), -- Scoping
  -- ... other fields
)

agenda_items (
  id TEXT PRIMARY KEY,
  eventId TEXT REFERENCES events(id), -- Scoping
  -- ... other fields
)
```

### Data Flow

#### Registration Flow
```
1. User clicks: example.com#/register/E123ABC
2. PublicRegistrationForm receives eventId="E123ABC" as prop
3. Component queries: getEventById("E123ABC")
4. Supabase returns event data
5. Form renders with event branding
6. User submits → Participant created with eventId="E123ABC"
```

#### Check-In Flow
```
1. Staff opens: example.com?checkin=A456DEF
2. StandaloneCheckInPage receives agendaId="A456DEF" as prop
3. Component queries: getAgendaItemById("A456DEF")
4. Agenda item contains eventId
5. Component queries: getParticipantsByEvent(eventId)
6. Check-in operates with event-scoped data
```

### Security Model

#### Row Level Security (RLS)
Supabase RLS policies ensure data isolation:

```sql
-- Public can read all events (needed for registration pages)
CREATE POLICY "public_read_events" ON events
  FOR SELECT USING (true);

-- Public can create participants (self-registration)
CREATE POLICY "public_create_participants" ON participants
  FOR INSERT WITH CHECK (true);

-- Public can update participants (check-in)
CREATE POLICY "public_update_participants" ON participants
  FOR UPDATE USING (true);
```

#### Event-Based Isolation
Even with public access, data is isolated by event ID:

```typescript
// This participant can only check in for sessions in their event
async function checkIn(participantId, agendaItemId) {
  const participant = await getParticipant(participantId);
  const agenda = await getAgendaItem(agendaItemId);
  
  // Security check: same event?
  if (participant.eventId !== agenda.eventId) {
    throw new Error('Cannot check in to different event');
  }
  
  // Proceed with check-in...
}
```

## Migration Path

### Phase 1: Database Setup
1. Create Supabase tables using migration SQL
2. Configure RLS policies
3. Test database connectivity

### Phase 2: Data Migration
1. Export localStorage data as backup
2. Run migration utility
3. Verify data in Supabase tables
4. Test standalone pages

### Phase 3: Code Updates
1. Replace localStorage imports with Supabase data layer
2. Update components to use async data fetching
3. Add loading states
4. Handle errors gracefully

### Phase 4: Testing
1. Test registration links on different devices
2. Test check-in pages independently
3. Verify cross-device collaboration
4. Load testing for concurrent access

## Code Changes Required

### Component Updates

#### PublicRegistrationForm.tsx
```typescript
// Already correct! Uses eventId from props
export function PublicRegistrationForm({ eventId }: Props) {
  useEffect(() => {
    // Loads data using eventId from URL, not from session
    const event = await supabaseDB.getEventById(eventId);
  }, [eventId]);
}
```

#### StandaloneCheckInPage.tsx
```typescript
// Already correct! Uses agendaId from props
export function StandaloneCheckInPage({ agendaId }: Props) {
  useEffect(() => {
    // Agenda contains eventId for scoping
    const agenda = await supabaseDB.getAgendaItemById(agendaId);
    const participants = await supabaseDB.getParticipantsByEvent(agenda.eventId);
  }, [agendaId]);
}
```

### Data Layer Updates

Replace localStorage with Supabase:

```typescript
// Before
import * as localDB from '../utils/localStorage';
const events = localDB.getAllEvents();

// After
import * as supabaseDB from '../utils/supabaseDataLayer';
const events = await supabaseDB.getAllEvents();
```

## Testing Checklist

### Registration Links
- [ ] Create event in browser A
- [ ] Copy registration link
- [ ] Open link in browser B (incognito)
- [ ] Verify form loads with correct branding
- [ ] Submit registration
- [ ] Verify participant appears in admin dashboard

### Check-In Pages
- [ ] Create agenda item
- [ ] Copy check-in link
- [ ] Open link on different device
- [ ] Verify participant list loads
- [ ] Perform check-in
- [ ] Verify attendance recorded

### Cross-Device Access
- [ ] Log in on device A
- [ ] Create/modify event
- [ ] Log in on device B
- [ ] Verify changes are visible
- [ ] Make changes on device B
- [ ] Verify on device A

### Error Handling
- [ ] Invalid event ID shows user-friendly error
- [ ] Network errors handled gracefully
- [ ] Missing data shows appropriate message
- [ ] Loading states display correctly

## Performance Considerations

### Caching Strategy
```typescript
// Cache event data to reduce database calls
const eventCache = new Map<string, Event>();

async function getEventCached(id: string): Promise<Event | null> {
  if (eventCache.has(id)) {
    return eventCache.get(id)!;
  }
  
  const event = await supabaseDB.getEventById(id);
  if (event) {
    eventCache.set(id, event);
  }
  
  return event;
}
```

### Query Optimization
```typescript
// Use selective queries
const { data } = await supabase
  .from('participants')
  .select('id, name, email') // Only needed columns
  .eq('eventId', eventId)
  .limit(100); // Pagination for large datasets
```

## Monitoring & Debugging

### Logging
```typescript
// Add context to logs
console.log('[REGISTRATION] Loading event:', {
  eventId,
  url: window.location.href,
  timestamp: new Date().toISOString()
});
```

### Error Tracking
```typescript
try {
  const event = await getEventById(eventId);
} catch (error) {
  // Log with context
  console.error('[ERROR] Failed to load event:', {
    eventId,
    error: error.message,
    stack: error.stack,
  });
  
  // Show user-friendly message
  setError('Unable to load event. Please check your link and try again.');
}
```

## Rollback Plan

If issues arise:

1. **Keep localStorage data** - Don't delete until migration is verified
2. **Backup database** - Export Supabase data before major changes
3. **Feature flag** - Toggle between localStorage and Supabase:

```typescript
const USE_SUPABASE = true; // Feature flag

const dataLayer = USE_SUPABASE ? supabaseDB : localDB;
const events = await dataLayer.getAllEvents();
```

## Future Enhancements

### 1. Offline Support
```typescript
// Service worker for offline registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### 2. Real-Time Updates
```typescript
// Supabase real-time subscriptions
supabase
  .channel('participants')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'participants' },
    (payload) => {
      // Update UI with new participant
    }
  )
  .subscribe();
```

### 3. Analytics
```typescript
// Track registration conversions
await supabase.from('analytics').insert({
  eventId,
  action: 'registration_complete',
  timestamp: new Date().toISOString()
});
```

## Conclusion

This architectural fix transforms the system from a single-browser application to a proper multi-device, cloud-backed event management platform. The key insight is:

> **Event context must come from the URL, not from session data.**

This principle enables:
- ✅ Public registration links that work anywhere
- ✅ Standalone check-in pages on any device
- ✅ Multi-organizer collaboration
- ✅ Scalable, production-ready architecture

The migration from localStorage to Supabase is not just a technical change—it's fixing a fundamental design flaw that prevented the system from functioning as intended for public-facing event management.
