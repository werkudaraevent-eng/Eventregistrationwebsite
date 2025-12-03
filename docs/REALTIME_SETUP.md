# Supabase Realtime Setup & Configuration

## What Changed

✅ **Removed annoying auto-refresh:**
- Deleted 3-second polling interval
- Removed localStorage event listeners
- Removed window.dispatchEvent calls

✅ **Implemented Supabase Realtime:**
- Real-time subscription to participant changes
- Instant UI updates on INSERT, UPDATE, DELETE
- Smooth, non-blocking experience

## How Realtime Works

```typescript
const subscription = supabase
  .channel(`participants_${eventId}`)
  .on(
    'postgres_changes',
    {
      event: '*', // All events
      schema: 'public',
      table: 'participants',
      filter: `eventId=eq.${eventId}`
    },
    (payload) => {
      // Handle INSERT, UPDATE, DELETE
      // Update state directly - no full page refresh
    }
  )
  .subscribe();
```

## Requirements for Realtime

### 1. Enable Realtime in Supabase

Go to **Supabase Dashboard → Replication** → Enable for `public.participants`:

```sql
-- This enables realtime for participants table
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
```

Or via UI:
1. Go to Supabase Dashboard
2. Click on your project
3. Go to **Replication** (or **Publications**)
4. Find `supabase_realtime` publication
5. Check the **participants** table checkbox
6. Click **Save**

### 2. Verify in Supabase Console

Terminal:
```bash
supabase status
```

Should show realtime extension enabled.

## Testing Realtime

1. **Open Event Management** in browser
2. **Add Participant** in one browser tab
3. **Participant should appear instantly** in another tab (if open)
4. **No refresh needed** - real-time magic! ✨

## Benefits

| Before | After |
|--------|-------|
| ❌ Polling every 3 seconds | ✅ Instant updates via WebSocket |
| ❌ Annoying flickering/flashing | ✅ Smooth, seamless UI |
| ❌ Extra server load | ✅ Efficient, event-driven |
| ❌ Stale data possible | ✅ Always synchronized |
| ❌ No cross-tab sync | ✅ Real-time across all tabs |

## Troubleshooting

### Realtime not working - console shows no logs

**Check 1:** Realtime publication enabled?
```sql
-- Check if table is in publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Check 2:** Network tab - look for WebSocket connections:
- Should see connection to `wss://...` (WebSocket Secure)

**Check 3:** Enable debug logs in ParticipantManagement.tsx:
- Look for `[REALTIME]` console messages
- Should see "Setting up Supabase Realtime subscription"

### Data not updating UI

**Problem:** Subscribe works but UI doesn't update

**Solution:** Make sure using `setParticipants` (state setter):
```typescript
// ✅ Correct - updates component state
setParticipants(prev => [...prev, newParticipant]);

// ❌ Wrong - direct array manipulation
participants.push(newParticipant);
```

### WebSocket timeout errors

**Cause:** Network/firewall blocking WebSocket

**Solution:**
1. Check firewall settings
2. Verify `VITE_SUPABASE_URL` is correct
3. Try disabling browser extensions
4. Check Supabase project region (latency)

## Performance Notes

- ✅ Realtime uses minimal bandwidth (event-driven)
- ✅ Automatic connection pooling
- ✅ Handles network reconnection automatically
- ✅ Scales to 1000+ concurrent connections
- ✅ Zero CPU polling overhead

## Code Changes Made

**File:** `src/components/ParticipantManagement.tsx`

1. **Removed:**
   - 3-second polling interval
   - localStorage event listeners
   - `window.dispatchEvent` calls

2. **Added:**
   - Supabase Realtime subscription
   - INSERT handler → new participants
   - UPDATE handler → modified participants
   - DELETE handler → removed participants

3. **Result:**
   - Smooth, real-time UI updates
   - No annoying auto-refresh
   - Professional user experience

## Next Steps

1. ✅ Enable Realtime in Supabase (instructions above)
2. ✅ Refresh browser with updated code
3. ✅ Test adding participant across tabs
4. ✅ Enjoy smooth real-time updates!

## Reference

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase RealtimePostgresChangesPayload](https://supabase.com/docs/reference/javascript/realtime-subscribe)
