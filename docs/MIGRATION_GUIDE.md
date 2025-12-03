# Database Migration Guide

## Critical Architectural Fix: Moving from localStorage to Supabase

### The Problem

The event registration system was originally built using **localStorage**, which stores data only in the browser where it was created. This caused critical failures:

1. **Registration links don't work**: Public registration URLs (e.g., `#/register/EVENT123`) would show "Event not found" when opened on different devices or browsers
2. **Check-in pages fail**: Standalone check-in dashboards couldn't access event data from other devices
3. **No cross-device access**: Organizers couldn't manage events from multiple devices
4. **Session dependency**: Standalone pages relied on organizer session data instead of URL-based context

### The Solution

Migrate all event data to **Supabase database tables** for centralized, cross-device storage. This enables:

✅ Public registration links that work anywhere  
✅ Standalone check-in pages accessible from any device  
✅ Multi-device event management  
✅ URL-based context (no session dependency)  
✅ Real-time collaboration between organizers  

---

## Migration Steps

### Step 1: Set Up Supabase Database

1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project
   - Click on "SQL Editor" in the left sidebar

2. **Run the Migration SQL**
   - Open the file `/supabase/migrations/001_create_event_tables.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" to create the tables

3. **Verify Tables Created**
   - Go to "Table Editor" in Supabase Dashboard
   - You should see three new tables:
     - `events`
     - `participants`
     - `agenda_items`

### Step 2: Migrate Your Data

#### Option A: Using the Migration UI (Recommended)

1. **Access Migration Dialog**
   - Log into your admin dashboard
   - Look for the "Migrate to Cloud" or "Database Migration" option
   - This will be added to the EventSelection or AdminDashboard component

2. **Download Backup (Recommended)**
   - Click "Download Backup" button
   - Save the JSON file to a safe location
   - This creates a backup of all your localStorage data

3. **Run Migration**
   - Click "Start Migration" button
   - Wait for the process to complete
   - Review the migration summary

4. **Reload Application**
   - Click "Reload & Use Cloud Data"
   - The app will now use Supabase instead of localStorage

#### Option B: Manual Migration via Console

```javascript
// Open browser console (F12) and run:
import { migrateToSupabase } from './utils/dataMigration';
const status = await migrateToSupabase();
console.log(status);
```

### Step 3: Update Application Code

The application needs to be updated to use the Supabase data layer instead of localStorage. This involves:

1. **Replace localStorage imports** with `supabaseDataLayer` imports
2. **Make all data operations async** (Supabase uses promises)
3. **Update components** to handle loading states

---

## What Gets Migrated

| Data Type | localStorage Key | Supabase Table |
|-----------|-----------------|----------------|
| Events | `events` | `events` |
| Participants | `event_participants` | `participants` |
| Agenda Items | `event_agenda` | `agenda_items` |
| Custom Fields | Part of event data | `events.customFields` (JSONB) |
| Branding Settings | Part of event data | `events.branding` (JSONB) |
| Column Visibility | Part of event data | `events.columnVisibility` (JSONB) |

---

## Database Schema

### Events Table
```sql
- id (TEXT, PK)
- name (TEXT)
- startDate (TEXT)
- endDate (TEXT)
- location (TEXT)
- description (TEXT)
- createdAt (TEXT)
- customFields (JSONB) -- Array of custom field definitions
- columnVisibility (JSONB) -- Which columns to show
- branding (JSONB) -- Logo, colors, fonts for registration page
```

### Participants Table
```sql
- id (TEXT, PK)
- eventId (TEXT, FK → events.id)
- name (TEXT)
- email (TEXT)
- phone (TEXT)
- company (TEXT)
- position (TEXT)
- registeredAt (TEXT)
- attendance (JSONB) -- Array of check-in records
- customData (JSONB) -- Custom field values
```

### Agenda Items Table
```sql
- id (TEXT, PK)
- eventId (TEXT, FK → events.id)
- title (TEXT)
- description (TEXT)
- startTime (TEXT)
- endTime (TEXT)
- location (TEXT)
- createdAt (TEXT)
```

---

## Security & Access Control

### Row Level Security (RLS) Policies

The database uses Supabase RLS for security:

1. **Public Read Access** - Anyone can view events, participants, and agenda items (needed for registration/check-in)
2. **Public Write Access** - Anyone can create participants (self-registration) and update attendance (check-in)
3. **Event-Scoped Data** - All queries are filtered by `eventId` to prevent cross-event data leaks

### URL-Based Security

Instead of relying on sessions/cookies:

- **Registration URLs**: `#/register/{EVENT_ID}` - Event ID determines which event's data to use
- **Check-in URLs**: `?checkin={AGENDA_ID}` - Agenda ID determines which session and event

---

## Testing the Migration

### 1. Test Registration Links

1. Create an event in the admin dashboard
2. Copy the registration link (should contain event ID in URL)
3. Open link in a **different browser** or **incognito window**
4. Verify the registration form loads correctly
5. Submit a test registration
6. Check if participant appears in admin dashboard

### 2. Test Check-In Pages

1. Create an agenda item
2. Copy the check-in link
3. Open in a different device/browser
4. Verify participant list loads
5. Test QR code scanning or manual check-in

### 3. Test Cross-Device Access

1. Log into admin dashboard on Device A
2. Create/modify an event
3. Log into admin dashboard on Device B
4. Verify changes are visible immediately

---

## Rollback Plan

If you need to revert to localStorage:

1. **Keep your backup JSON file** from Step 2
2. **Don't delete localStorage data** until you're confident
3. To revert:
   - Comment out Supabase data layer imports
   - Uncomment localStorage imports
   - Reload the application

---

## FAQ

### Q: Will my old localStorage data be deleted?
**A:** No, the migration is non-destructive. Your localStorage data remains intact. You can delete it manually later if desired.

### Q: What happens if I run migration twice?
**A:** The migration checks for existing records and won't create duplicates. It's safe to run multiple times.

### Q: Can I use both localStorage and Supabase?
**A:** No, the application should use one or the other. After migration, switch to Supabase completely.

### Q: Do I need authentication for standalone pages?
**A:** No, standalone pages (registration, check-in) work without authentication. The event ID in the URL provides the necessary context.

### Q: How do I secure my data?
**A:** Use Supabase RLS policies to restrict write access. For production, consider:
- Requiring authentication for event creation/deletion
- Adding admin-only policies
- Implementing API rate limiting

### Q: What if Supabase is down?
**A:** Implement error handling and fallback UI. Consider caching strategies or offline-first architecture for critical paths.

---

## Support & Troubleshooting

### Common Issues

#### "PGRST204: Failed to query database"
- Check if Supabase tables exist
- Verify RLS policies are enabled
- Check Supabase project status

#### "Event not found" after migration
- Verify data actually migrated (check Supabase table editor)
- Check browser console for errors
- Ensure event ID in URL is correct

#### Migration fails with permission errors
- Verify RLS policies are set correctly
- Check Supabase project roles
- Ensure public access is enabled for necessary operations

### Getting Help

1. Check browser console for errors
2. Review Supabase logs in dashboard
3. Verify API keys are correct in `/utils/supabase/info.tsx`
4. Test database connection with simple query

---

## Next Steps After Migration

1. ✅ Test all registration links
2. ✅ Test all check-in pages
3. ✅ Verify cross-device access
4. ✅ Update any bookmarked/saved URLs
5. ✅ Share new registration links with participants
6. ✅ Train staff on new check-in process
7. ✅ Monitor Supabase usage/quotas
8. ✅ Set up regular backups
9. ✅ Review and tighten RLS policies for production

---

## Conclusion

This migration fixes the fundamental architectural flaw where standalone pages couldn't access data across devices. After migration:

- ✅ Registration links work anywhere
- ✅ Check-in pages are truly standalone
- ✅ Multi-device collaboration enabled
- ✅ No more "Event not found" errors
- ✅ URL-based context replaces session dependency

**The system is now properly architected for public-facing, cross-device event management.**
