# QR Code Attachment Testing Guide

## What Changed

Added automatic QR code attachment to emails when `include_qr_code` is enabled in email template.

### Implementation Details

1. **BlastCampaigns.tsx**: 
   - Checks `template.include_qr_code` boolean
   - Generates QR code URL via external API: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${participant.id}`
   - Adds URL to attachments array
   - Edge Function fetches and converts to email attachment

2. **Edge Function** (send-email):
   - Receives attachments array (URLs as strings)
   - Fetches each URL
   - Converts to Uint8Array
   - Attaches to email with filename from URL

## Testing Steps

### 1. Enable QR Code in Template

```sql
-- Check current templates
SELECT id, name, include_qr_code FROM email_templates;

-- Enable QR code for a template
UPDATE email_templates 
SET include_qr_code = true 
WHERE id = 'YOUR_TEMPLATE_ID';
```

### 2. Create Test Campaign

1. Go to **Blast Campaigns** tab
2. Click **Create New Campaign**
3. Select template with `include_qr_code = true`
4. Select 1-2 test participants
5. Send campaign

### 3. Verify Email

Check recipient's email:
- ✅ Email should have attachment (QR-{participant_id}.png or similar)
- ✅ QR code should be 300x300 PNG
- ✅ Scanning QR should show participant ID

### 4. Check Logs

In browser console (BlastCampaigns page):
```
[BlastCampaign] Adding QR code attachment for participant: P1234567890ABC
```

In Supabase Edge Function logs:
```
[SMTP] Processing attachments...
[SMTP] Fetching attachment: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=P1234567890ABC
[SMTP] Attachment added: attachment Size: XXXXX bytes
```

## Troubleshooting

### No Attachment in Email

1. **Check template setting**:
   ```sql
   SELECT include_qr_code FROM email_templates WHERE id = 'YOUR_TEMPLATE_ID';
   ```
   Should return `true`

2. **Check browser console** for BlastCampaign logs

3. **Check Edge Function logs**:
   - Go to Supabase Dashboard → Edge Functions → send-email → Logs
   - Look for "Processing attachments" message

### Attachment Fails to Fetch

- External API might be down: `https://api.qrserver.com/v1/create-qr-code/`
- Edge Function might have network restrictions
- Check Edge Function logs for fetch errors

### QR Code Not Scannable

- Verify participant ID format (should be like `P1730567890ABC`)
- Check QR code size (300x300 should be scannable)
- Try different QR scanner app

## Database Schema Reference

```sql
-- email_templates table has include_qr_code column
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS include_qr_code BOOLEAN DEFAULT false;

-- Check migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'email_templates' 
AND column_name = 'include_qr_code';
```

## Future Enhancements

### Option 1: Store QR in Supabase Storage (Recommended)

**Benefits**:
- Faster email sending (no external API dependency)
- Custom QR design/branding
- Offline capability

**Implementation**:
1. Add `qr_code_url` column to `participants` table
2. Generate QR on participant registration using `qrcode` library
3. Upload to Supabase Storage bucket `participant-qr-codes`
4. Save public URL to participant record
5. Use stored URL in BlastCampaigns instead of external API

### Option 2: Generate QR On-The-Fly in Edge Function

**Benefits**:
- No storage needed
- Always fresh QR code

**Implementation**:
1. Install QR code library in Edge Function
2. Generate QR in Edge Function when sending email
3. Attach directly without external fetch

## Related Files

- `src/components/BlastCampaigns.tsx` - QR attachment logic
- `supabase/functions/send-email/index.ts` - Email sending with attachments
- `supabase/migrations/006_add_qr_code_option.sql` - Database schema
- `ATTACHMENTS_QR_UPDATE.md` - Original requirements doc

## Questions?

Check Edge Function logs in Supabase Dashboard for detailed debugging information.
