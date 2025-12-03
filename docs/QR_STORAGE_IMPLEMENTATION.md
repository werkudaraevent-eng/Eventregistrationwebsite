# QR Code Storage Implementation - Testing Guide

## Implementation Summary

QR codes are now **automatically generated and stored** when participants register, not generated on-the-fly during email sending.

### Architecture:
1. **Participant Registration** → Auto-generate QR code PNG
2. **Upload to Supabase Storage** → `participant-qr-codes` bucket
3. **Save public URL** → `participants.qr_code_url` column
4. **Email Sending** → Fetch QR URL from database, attach to email
5. **Participant Detail** → Display QR code from database

---

## Setup Steps

### 1. Run Database Migration

Open **Supabase SQL Editor** and run:

```sql
-- File: ADD_QR_CODE_COLUMN.sql
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

CREATE INDEX IF NOT EXISTS idx_participants_qr_code ON participants(qr_code_url);

COMMENT ON COLUMN participants.qr_code_url IS 'URL to QR code image in Supabase Storage';
```

### 2. Create Supabase Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **New Bucket**
3. Bucket name: `participant-qr-codes`
4. **Public bucket**: ✅ YES (enable public access)
5. Click **Create Bucket**

### 3. Set Storage Policies (RLS)

In Supabase Storage, set policies for `participant-qr-codes`:

```sql
-- Allow public READ access
CREATE POLICY "Public read access for QR codes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'participant-qr-codes');

-- Allow authenticated INSERT
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'participant-qr-codes');

-- Allow authenticated UPDATE
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'participant-qr-codes');
```

---

## Testing

### Test 1: New Participant Registration

1. Go to **Participants** tab
2. Click **Add Participant**
3. Fill form and submit
4. **Check browser console**: Should see `[createParticipant] QR code uploaded successfully`
5. **Check Supabase Storage**: File `part_XXXXX.png` should exist in bucket
6. **Refresh participants table**: `qr_code_url` column should have URL

### Test 2: Send Email with QR Attachment

1. **Enable QR code** in email template:
   ```sql
   UPDATE email_templates 
   SET include_qr_code = true 
   WHERE id = 'your_template_id';
   ```

2. **Create campaign** with that template
3. **Send to test participant**
4. **Check email**: Should have QR code attachment from Supabase Storage URL
5. **Check Supabase logs**: Should see `[BlastCampaign] Adding QR code from database: https://...`

### Test 3: Participant Detail View (Next Step)

Will be implemented to show QR code when clicking participant name in table.

---

## Verify Storage Bucket

Check if bucket exists and has public access:

```sql
SELECT name, public 
FROM storage.buckets 
WHERE name = 'participant-qr-codes';
```

Should return:
```
name                    | public
-----------------------|--------
participant-qr-codes   | true
```

---

## Expected File Structure

Supabase Storage `participant-qr-codes/`:
```
part_1762509648756_3hp1dhw24.png  (600x600 QR code PNG)
part_1762929719206_eq6e8xp39.png
part_1763045123456_abc123xyz.png
...
```

Each PNG file:
- **Size**: ~10-20 KB
- **Dimensions**: 600x600 pixels
- **Format**: PNG with transparent background
- **Content**: Participant ID encoded as QR code

---

## Troubleshooting

### QR Code Not Generated

**Check browser console** for errors:
```
[createParticipant] Failed to upload QR code: ...
```

Common issues:
- Storage bucket doesn't exist
- Bucket is not public
- RLS policies blocking upload

### QR Code Not in Email

**Check**:
1. Template has `include_qr_code = true`
2. Participant has `qr_code_url` populated
3. Browser console shows: `Adding QR code from database`
4. Supabase logs show attachment URL

### Old Participants Missing QR

Run migration script to generate QR for existing participants (coming next).

---

## Next Steps

After setup complete:
1. ✅ Test new participant registration
2. ✅ Verify QR code in storage
3. ✅ Send test email with QR attachment
4. 🔜 Add QR display in participant detail modal
5. 🔜 Bulk QR generation for existing participants

---

## Benefits of This Approach

✅ **Faster email sending** - No QR generation during send
✅ **Consistent QR codes** - Same QR for participant across all emails
✅ **Offline capability** - QR stored independently
✅ **Better UX** - Can display QR in participant management UI
✅ **Reliable** - No dependency on external QR API
✅ **Scalable** - CDN-backed Supabase Storage
