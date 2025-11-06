# Quick Start - Testing Public Registration & Branding

## Issue: Public Registration Not Loading

**URL:** `http://localhost:3000/?register=E1762078489378TL0G`  
**Error:** Event not found

## Root Cause

URL format sudah benar, tapi:
1. Component melihat query param `register=` (sudah benar)
2. Query param passed ke PublicRegistrationForm ✅
3. PublicRegistrationForm sekarang query Supabase (bukan localStorage) ✅

## Testing Steps

### 1. Verify Event Exists in Supabase

Go to Supabase Dashboard:
```
Tables → events → Check if "Sofia Birthday" event exists
Should have: id, name, startDate, endDate, location
```

### 2. Get Correct Event ID

From Events table in Supabase, copy the `id` value:
```
Example: evt_1762078489378_abc123def456
```

### 3. Test Public Registration URL

Open browser:
```
http://localhost:3000/?register=evt_1762078489378_abc123def456
```

Should see:
- ✅ Event name loads
- ✅ Event description displays
- ✅ Custom fields appear (if any)
- ✅ Branding colors/logo show (if configured)
- ✅ Form is interactive
- ✅ Submit button works

### 4. Submit Registration

Fill form and submit:
- ✅ Should see success modal
- ✅ Check Supabase participants table - new record appears
- ✅ No error messages

## Branding & Logo System

### How Branding Works

1. **Event Branding Settings:**
   - Store in `events.branding` column (JSON)
   - Contains: logoUrl, headerText, primaryColor, backgroundColor, fontFamily

2. **Logo Upload Flow:**
   - User uploads logo in BrandingSettings component
   - Logo saved in events.branding
   - Public registration loads and displays logo

3. **No Re-upload Needed:**
   - If logo exists in events.branding, display it
   - Don't prompt for re-upload
   - User can change logo in settings

### Update BrandingSettings Component

File: `src/components/BrandingSettings.tsx`

Change needed - query Supabase instead of localStorage:

```typescript
// Before
const event = localDB.getEventById(eventId);

// After
const { data: event } = await supabase
  .from('events')
  .select('*')
  .eq('id', eventId)
  .single();
```

Same pattern for:
- Load branding: query events.branding
- Save branding: update events.branding
- Delete logo: set logoUrl to null

## Common Issues & Fixes

### Issue: "Event not found" on registration page

**Check:**
1. Supabase events table has the event
2. Event ID in URL matches exactly
3. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local

**Fix:**
```bash
# Restart dev server
npm run dev
```

### Issue: Logo not showing on public registration

**Check:**
1. Logo URL is in events.branding JSON
2. Logo URL is accessible/valid
3. Branding data is being fetched

**Fix:**
```typescript
// Add debugging to loadEventData
console.log('Branding data:', eventData.branding);
```

### Issue: Form submission fails

**Check:**
1. Supabase participants table exists
2. RLS policies allow inserts
3. Check browser console for error message

**Fix:**
```sql
-- In Supabase SQL Editor, re-run RLS policies
DROP POLICY IF EXISTS "Public insert access for participants" ON participants;
CREATE POLICY "Public insert access for participants"
    ON participants FOR INSERT WITH CHECK (true);
```

## Database Columns Reference

### events table
```
- id: TEXT (primary key)
- name: TEXT
- startDate: TEXT
- endDate: TEXT
- location: TEXT
- description: TEXT
- createdAt: TEXT
- customFields: JSONB (array)
- branding: JSONB (object with logoUrl, colors, fonts)
```

### participants table
```
- id: TEXT (primary key)
- eventId: TEXT (foreign key to events)
- name: TEXT
- email: TEXT
- phone: TEXT
- company: TEXT
- position: TEXT
- registeredAt: TEXT
- attendance: JSONB (array)
- customData: JSONB (object)
```

### branding object format
```json
{
  "logoUrl": "https://...",
  "headerText": "Join us!",
  "primaryColor": "#7C3AED",
  "backgroundColor": "#FFFFFF",
  "fontFamily": "sans-serif"
}
```

## URL Query Parameters

### Public Registration
```
?register=EVENT_ID
```

Example:
```
http://localhost:3000/?register=evt_1762078489378_abc123def456
```

### Event Management
```
Default: http://localhost:3000
Admin dashboard for event organizers
```

### Standalone Check-in
```
?checkin=AGENDA_ID
(Not yet implemented with query params)
```

## Migration Complete ✅

All components now use Supabase:
- ✅ PublicRegistrationForm - reads event + branding from Supabase
- ✅ BrandingSettings - saves to events.branding (needs update)
- ✅ ParticipantManagement - Realtime participants
- ✅ AgendaManagement - Full CRUD on Supabase
- ✅ StandaloneCheckInPage - Supabase check-in

## Next Phase

After testing public registration, update:
1. **BrandingSettings.tsx** - Use Supabase queries
2. **Any remaining localStorage references** - Replace with Supabase
3. **Add Supabase Storage** - For logo file uploads (optional)
4. **Email notifications** - Confirmation emails (optional)

---

**Status:** Ready for integration testing ✅
