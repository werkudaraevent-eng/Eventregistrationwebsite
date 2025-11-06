# Quick Start Guide: Fixing "Event Not Found" Errors

## Problem
Registration links and check-in pages show "Event not found" when opened on different devices or browsers.

## Cause
Data is stored in browser localStorage, which is isolated per browser. Other devices can't access it.

## Solution
Migrate to Supabase cloud database in 3 simple steps.

---

## Step 1: Set Up Supabase Database (5 minutes)

### 1.1 Access Supabase SQL Editor
1. Go to [supabase.com](https://supabase.com/dashboard)
2. Open your project
3. Click **"SQL Editor"** in the sidebar

### 1.2 Run Migration SQL
1. Open file: `/supabase/migrations/001_create_event_tables.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click **"Run"** button
5. Wait for "Success" message

### 1.3 Verify Tables Created
1. Click **"Table Editor"** in sidebar
2. You should see three new tables:
   - ✅ `events`
   - ✅ `participants`
   - ✅ `agenda_items`

**Done!** Database is ready.

---

## Step 2: Migrate Your Data (2 minutes)

### 2.1 Access Migration Tool
1. Log into admin dashboard
2. Select any event OR go to event selection page
3. Look for yellow banner: **"Action Required: Migrate to Cloud Database"**
4. Click **"Migrate Now"** button

### 2.2 Backup Your Data (Recommended)
1. In migration dialog, click **"Download Backup"**
2. Save the JSON file safely
3. This is your safety net!

### 2.3 Run Migration
1. Click **"Start Migration"** button
2. Wait for progress bar to complete (usually 10-30 seconds)
3. Review migration summary:
   - ✓ X events migrated
   - ✓ X participants migrated
   - ✓ X agenda items migrated

### 2.4 Reload Application
1. Click **"Reload & Use Cloud Data"**
2. Page will refresh
3. You're now using Supabase!

**Done!** Your data is now in the cloud.

---

## Step 3: Test Everything (3 minutes)

### 3.1 Test Registration Link
1. Open any event in admin dashboard
2. Copy the registration link
3. **Open in a different browser** (or incognito window)
4. ✅ Form should load correctly
5. Submit a test registration
6. ✅ Verify participant appears in admin dashboard

### 3.2 Test Check-In Page
1. Create or open an agenda item
2. Copy the check-in link
3. **Open on a different device** (phone, tablet, etc.)
4. ✅ Participant list should load
5. Try checking someone in
6. ✅ Verify check-in is recorded

### 3.3 Test Cross-Device Admin
1. Log into admin dashboard on computer
2. Create or edit an event
3. Log into admin dashboard on phone
4. ✅ Changes should be visible immediately

**Done!** Everything is working cross-device.

---

## Troubleshooting

### "Migration failed" Error

**Check 1: Is Supabase set up correctly?**
- Go to Supabase → SQL Editor
- Run: `SELECT * FROM events LIMIT 1;`
- Should return results (or empty, not error)

**Check 2: Are policies enabled?**
- Go to Supabase → Table Editor → `events` table
- Click settings (gear icon)
- Ensure "Enable Row Level Security" is ON

**Check 3: Network connectivity**
- Check browser console (F12)
- Look for network errors
- Ensure Supabase project is active

### "Event not found" Still Appears

**Check 1: Did migration succeed?**
- Go to Supabase → Table Editor → `events`
- Verify your events are there

**Check 2: Is URL correct?**
- Registration URL should look like: `#/register/E1234567890ABC`
- Check-in URL should look like: `?checkin=A1234567890`
- Event ID must match database

**Check 3: Clear browser cache**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache entirely

### Migration Dialog Doesn't Appear

**Option 1: Manual migration**
1. Open browser console (F12)
2. Go to "Console" tab
3. Paste this code:
```javascript
import { migrateToSupabase } from './utils/dataMigration';
migrateToSupabase().then(console.log);
```
4. Press Enter
5. Wait for result

**Option 2: Check for existing migration**
- Open Supabase → Table Editor → `events`
- If your events are already there, you're done!
- Just use the Supabase data layer

---

## What Changed?

### Before (localStorage)
```
❌ Data stored in browser only
❌ Each device has separate data
❌ Registration links don't work elsewhere
❌ Check-in pages fail on other devices
```

### After (Supabase)
```
✅ Data stored in cloud database
✅ All devices access same data
✅ Registration links work everywhere
✅ Check-in pages work on any device
```

---

## Important Notes

### Your Data is Safe
- ✅ Migration doesn't delete localStorage data
- ✅ Original data remains as backup
- ✅ Migration is additive (won't duplicate if run twice)

### URLs Stay the Same
- ✅ Registration links: Same format
- ✅ Check-in links: Same format
- ✅ No need to regenerate or reshare links

### Performance
- ✅ Cloud database is faster for cross-device access
- ✅ Multiple people can work on same event
- ✅ Real-time updates possible

---

## Next Steps

1. **Share registration links**
   - Links now work on any device!
   - Share via email, SMS, social media
   - No more "event not found" errors

2. **Set up check-in stations**
   - Open check-in link on tablets/phones
   - Staff can check in participants from any device
   - All updates sync in real-time

3. **Collaborate with team**
   - Multiple admins can log in simultaneously
   - Everyone sees the same data
   - Changes sync across all devices

4. **Monitor your events**
   - Log in from anywhere to check registrations
   - View check-in statistics remotely
   - Manage events on the go

---

## Need Help?

1. **Check documentation**
   - Read `MIGRATION_GUIDE.md` for detailed info
   - See `ARCHITECTURE_FIX.md` for technical details

2. **Check Supabase logs**
   - Go to Supabase → Logs
   - Look for errors or warnings

3. **Backup your data**
   - Always keep the downloaded JSON backup
   - Can restore manually if needed

---

## Success Checklist

After completing all steps, verify:

- [x] Supabase tables exist (events, participants, agenda_items)
- [x] Migration completed successfully
- [x] Registration link works in different browser
- [x] Check-in link works on different device
- [x] Admin dashboard accessible from multiple devices
- [x] No "Event not found" errors
- [x] Downloaded backup file saved safely

**Congratulations!** Your event registration system is now fully functional across all devices! 🎉
