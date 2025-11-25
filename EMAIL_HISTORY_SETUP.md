# Email History Setup Guide

## Overview
Email History adalah fitur baru yang menampilkan semua history pengiriman email dalam satu tempat terpusat, termasuk:
- ✉️ Email blast campaigns
- 🧪 Test emails
- ✅ Email konfirmasi registrasi
- 📧 Email individual

## Setup Instructions

### 1. Create Database Table

Jalankan SQL file untuk membuat table `participant_emails`:

```powershell
# Login ke Supabase dashboard
# Buka SQL Editor
# Copy-paste isi file CREATE_EMAIL_HISTORY_TABLE.sql
# Run the query
```

Atau via Supabase CLI:
```powershell
npx supabase db push
```

File SQL: `CREATE_EMAIL_HISTORY_TABLE.sql`

### 2. Verify Table Creation

Di Supabase SQL Editor, jalankan:
```sql
SELECT * FROM participant_emails LIMIT 10;
```

### 3. Access Email History

1. Login ke Admin Dashboard
2. Pilih event yang ingin di-monitor
3. Klik tab **"Email History"** (icon History/Clock)
4. Email history akan muncul dengan informasi:
   - Timestamp pengiriman
   - Recipient name & email
   - Subject
   - Campaign name
   - Email type (Blast/Confirmation/Individual/Test)
   - Status (Sent/Failed/Opened/Clicked)
   - Error message (jika failed)
   - Activity timeline (opened_at, clicked_at)

## Features

### 1. Statistics Dashboard
Menampilkan 6 metrics:
- Total Emails
- Sent (successfully delivered)
- Opened (via tracking pixel)
- Clicked (via link tracking)
- Failed (delivery errors)
- Pending (waiting to be sent)

### 2. Search & Filters
- **Search**: Cari by recipient name, email, subject, atau campaign name
- **Status Filter**: Filter by status (All/Sent/Opened/Clicked/Failed/Pending)
- **Type Filter**: Filter by email type (All/Blast/Confirmation/Individual/Test)

### 3. Sorting
Click pada kolom headers untuk sort by:
- Sent At (timestamp)
- Recipient (email address)
- Status

### 4. Pagination
- 50 emails per page
- Navigation dengan Previous/Next buttons
- Showing X to Y of Z total emails

### 5. Export to CSV
Click "Export CSV" button untuk download semua filtered data ke CSV file dengan columns:
- Timestamp
- Recipient Name
- Email Address
- Subject
- Campaign Name
- Status
- Type
- Error Message

### 6. Real-time Updates
Table akan auto-refresh ketika ada email baru terkirim (via Supabase Realtime subscription).

## Email Logging Flow

### Registration Confirmation Emails
File: `src/components/PublicRegistrationForm.tsx`

Saat participant register:
1. Participant data disimpan ke database
2. Email konfirmasi dikirim via edge function
3. **Email log dicatat ke `participant_emails` table** dengan:
   - participant_id
   - template_id & template_name
   - subject (personalized)
   - status: 'sent' atau 'failed'
   - error_message (jika gagal)
   - sent_at timestamp

### Blast Campaign Emails
File: `src/components/BlastCampaigns.tsx`

**NOTE**: Perlu update kode untuk menggunakan `participant_emails` table instead of `email_logs`.

Ketika blast campaign dikirim:
1. Loop through selected participants
2. Personalize subject & body
3. Create email log dengan status 'pending'
4. Send email via edge function
5. Update status to 'sent' atau 'failed'
6. Include **campaign_id** untuk link ke blast campaign

### Test Emails
File: `src/components/EmailTemplates.tsx` atau `BlastCampaigns.tsx`

Test emails juga dicatat dengan:
- template_name containing "Test"
- No campaign_id (NULL)
- Type automatically set to 'test'

## Database Schema

```sql
CREATE TABLE participant_emails (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  template_id UUID REFERENCES email_templates(id),
  template_name TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),  -- NULL for non-campaign emails
  subject TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'opened', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,    -- Set via tracking pixel
  clicked_at TIMESTAMPTZ,   -- Set via link tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Email Tracking

### Open Tracking
Tracking pixel injected ke email body:
```html
<img src="{supabase_url}/functions/v1/track-email?id={email_log_id}&pid={participant_id}" 
     width="1" height="1" style="display:none;" />
```

Ketika pixel di-load:
1. Edge function `track-email` triggered
2. Update `participant_emails` set `opened_at = now()`, `status = 'opened'`

### Click Tracking
Links di email di-modify dengan tracking parameter:
```
https://example.com/link?_track={email_log_id}
```

Ketika link di-click:
1. Edge function detects `_track` parameter
2. Update `participant_emails` set `clicked_at = now()`, `status = 'clicked'`

## Next Steps

### Migration dari email_logs (Optional)
Jika sudah ada data di `email_logs` table:

```sql
-- Migrate existing logs to participant_emails
INSERT INTO participant_emails (
  participant_id,
  template_id,
  template_name,
  campaign_id,
  subject,
  status,
  error_message,
  sent_at,
  opened_at,
  clicked_at,
  created_at
)
SELECT 
  participant_id,
  template_id,
  template_name,
  campaign_id,
  subject,
  status,
  error_message,
  sent_at,
  opened_at,
  clicked_at,
  created_at
FROM email_logs
WHERE sent_at >= '2025-01-01';  -- Adjust date as needed
```

### Update BlastCampaigns.tsx
File perlu di-update untuk menggunakan `participant_emails` instead of `email_logs`:

1. Change table name dari `email_logs` → `participant_emails`
2. Ensure all insert/update queries use new table
3. Keep same tracking logic
4. Test blast campaign flow

## Troubleshooting

### Email logs tidak muncul
- Check apakah table `participant_emails` sudah dibuat
- Verify RLS policies: authenticated users harus bisa SELECT
- Check browser console untuk errors
- Verify eventId matching participants table

### Status tidak update ke 'opened'
- Check tracking pixel di email HTML
- Verify edge function `track-email` running
- Test dengan email client yang tidak block images (bukan Gmail)

### Export CSV kosong
- Check filter settings (mungkin terlalu restrictive)
- Verify data exists di database
- Check browser console untuk errors

## Component Files

- **EmailHistory.tsx** - Main component (591 lines)
- **AdminDashboard.tsx** - Integration point (tab trigger)
- **CREATE_EMAIL_HISTORY_TABLE.sql** - Database setup
- **EMAIL_HISTORY_SETUP.md** - This guide

## Success!

Setelah setup:
- ✅ Tab "Email History" tersedia di Admin Dashboard
- ✅ Semua email tercatat dengan timestamp & status
- ✅ Real-time statistics dashboard
- ✅ Search, filter, sort, export functionality
- ✅ Tracking untuk email opens & clicks
- ✅ Error logging untuk troubleshooting
