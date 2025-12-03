# 📊 Email Open Tracking - Testing Guide

## ✅ Tracking Sudah Aktif!

Tracking pixel **sudah ter-inject** ke email dengan benar. Lihat di email source (Show Original):

```html
<img src="https://xtrognfmzyzqhsfvtgne.supabase.co/functions/v1/track-email?id=XXX&pid=YYY" 
     width="1" height="1" style="display:none;" />
```

---

## 🔍 Cara Test Tracking

### Test 1: Manual Test Tracking Pixel

1. **Ambil ID dari email log**:
   ```sql
   SELECT id, participant_id, status, opened_at 
   FROM email_logs 
   WHERE status = 'sent' 
   ORDER BY sent_at DESC 
   LIMIT 1;
   ```

2. **Copy URL tracking pixel** (dari Console log atau Show Original email):
   ```
   https://xtrognfmzyzqhsfvtgne.supabase.co/functions/v1/track-email?id=[EMAIL_LOG_ID]&pid=[PARTICIPANT_ID]
   ```

3. **Paste di browser** address bar → Enter

4. **Harusnya melihat blank page** (1x1 transparent GIF)

5. **Query lagi untuk verify**:
   ```sql
   SELECT id, status, opened_at 
   FROM email_logs 
   WHERE id = '[EMAIL_LOG_ID]';
   ```
   
   ✅ Kolom `opened_at` harusnya terisi!

---

### Test 2: Real Email Open Test

**⚠️ Gmail blocks external images by default!**

Untuk test di Gmail:

1. **Send campaign** baru
2. **Buka email di Gmail**
3. **Gmail akan tampilkan**: 
   ```
   "Images are not displayed. Display images below"
   ```
4. **Klik "Display images below"** atau **"Always display images from werkudara.event@gmail.com"**
5. **Tracking pixel akan di-load**
6. **Tunggu 2-3 detik**
7. **Klik "Refresh Status"** button di modal Participants
8. **Status harusnya berubah** dari "Sent" → "Opened"!

---

### Test 3: Check Edge Function Logs

1. **Buka Supabase Dashboard**
2. **Edge Functions** → **track-email** → **Logs**
3. **Buka email** (atau manual paste URL)
4. **Harusnya ada log baru**:
   ```
   [track-email] Tracking open - Log ID: xxx Participant ID: yyy
   [track-email] Email log updated successfully
   [track-email] Participant status updated to opened
   ```

---

## 🎯 Cara Kerja Tracking

### 1. Email Sent
- Email log created dengan `status = 'pending'`
- Tracking pixel di-inject ke HTML body
- Email sent via Gmail SMTP
- Status update ke `'sent'`

### 2. Email Opened
- Recipient buka email di Gmail
- Gmail load tracking pixel image (jika images enabled)
- Browser request: `GET /track-email?id=xxx&pid=yyy`
- Edge Function triggered

### 3. Status Update
- Edge Function update `email_logs.opened_at = NOW()`
- Edge Function update `email_logs.status = 'opened'`
- Edge Function update `participants.email_status = 'opened'`
- Return 1x1 transparent GIF

### 4. UI Refresh
- Click "Refresh Status" button
- Query latest status from database
- Badge changes: "Sent" (green) → "Opened" (blue)

---

## ❌ Troubleshooting

### Status Tidak Berubah Ke "Opened"

**Penyebab #1: Gmail Blocking Images**
- ✅ Solusi: Klik "Display images below" di email
- ✅ Atau: Whitelist sender (Always display from...)

**Penyebab #2: Edge Function Error**
- ✅ Check logs: Supabase Dashboard → Edge Functions → track-email → Logs
- ✅ Cek error message

**Penyebab #3: Tracking Pixel Tidak Ter-inject**
- ✅ Lihat Console log saat send: `[BlastCampaign] Tracking pixel URL:`
- ✅ Check email source (Show Original)
- ✅ Search untuk `track-email` - harusnya ada!

**Penyebab #4: Database Constraint Error**
- ✅ Pastikan sudah run: `FIX_EMAIL_TRACKING_SCHEMA.sql`
- ✅ Verify constraint:
   ```sql
   SELECT constraint_name, check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name LIKE '%email%status%';
   ```

---

## 📈 Query Berguna

### Lihat Email Tracking Stats
```sql
SELECT 
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'opened') as opened,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened_count,
  ROUND(
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0) * 100, 
    2
  ) as open_rate_percentage
FROM email_logs
WHERE campaign_id = 'YOUR_CAMPAIGN_ID';
```

### Lihat Participants Yang Sudah Buka Email
```sql
SELECT 
  p.name,
  p.email,
  el.sent_at,
  el.opened_at,
  EXTRACT(EPOCH FROM (el.opened_at - el.sent_at))/60 as minutes_until_opened
FROM email_logs el
JOIN participants p ON p.id = el.participant_id
WHERE el.campaign_id = 'YOUR_CAMPAIGN_ID'
  AND el.opened_at IS NOT NULL
ORDER BY el.opened_at DESC;
```

### Update Status Manual (Testing)
```sql
-- Simulate email opened
UPDATE email_logs 
SET 
  opened_at = NOW(),
  status = 'opened'
WHERE id = 'YOUR_EMAIL_LOG_ID';

UPDATE participants 
SET email_status = 'opened'
WHERE id = 'YOUR_PARTICIPANT_ID';
```

---

## 🚀 Recommendations

### Untuk Meningkatkan Open Rate Tracking:

1. **Whitelist Email Domain**
   - Minta recipients whitelist `werkudara.event@gmail.com`
   - Atau tambahkan ke "Safe Senders"

2. **Add Text di Email**
   ```
   "Can't see images? Click 'Display images below' to view full email."
   ```

3. **Use Click Tracking** (future enhancement)
   - Wrap all links dengan tracking redirect
   - Lebih reliable dari pixel tracking

4. **Monitor Bounce Rate**
   - Invalid emails akan bounce
   - Update status ke 'bounced'

---

## ✅ Summary

- ✅ Tracking pixel **sudah bekerja**
- ✅ Edge Function **sudah deployed**
- ✅ Database schema **sudah ready**
- ⚠️ Gmail blocks images **by default** → user harus enable
- 🔄 Use **"Refresh Status"** button untuk update real-time
- 📊 Open rate akan muncul di campaign statistics

**Next Steps:**
1. Send test campaign
2. Buka email dan enable images
3. Wait 2-3 seconds
4. Click "Refresh Status"
5. Status berubah ke "Opened"! 🎉
