# 🔥 FIX: Error 500 Saat Send Email

## 🎯 Root Cause

Edge function `send-email` masih cari config dengan cara lama:
```typescript
.eq('id', 'default')  // ❌ Tidak cocok dengan multi-config system
.eq('is_active', true)
```

Sekarang sudah diperbaiki untuk cari **hanya berdasarkan `is_active`**:
```typescript
.eq('is_active', true)  // ✅ Cocok dengan config ID apapun
.single()
```

---

## ✅ Solusi (3 Langkah)

### Step 1: Redeploy Edge Function

Jalankan di terminal PowerShell:

```powershell
cd d:\Github\Eventregistrationwebsite
.\redeploy-edge-function.ps1
```

**Atau manual:**

```powershell
npx supabase functions deploy send-email --no-verify-jwt
```

**Output yang diharapkan:**
```
✅ Deployment complete!
```

### Step 2: Pastikan Ada Config yang Active

Buka **Supabase SQL Editor** dan jalankan:

```sql
-- Check active config
SELECT id, config_name, provider, is_active, sender_email
FROM email_config
WHERE is_active = true;
```

**Expected result:**
- 1 row dengan `is_active = true`

**Jika tidak ada yang aktif**, jalankan:

```sql
-- Activate your SMTP config
UPDATE email_config 
SET is_active = true 
WHERE provider = 'smtp' 
LIMIT 1;

-- Verify
SELECT id, config_name, provider, is_active 
FROM email_config 
WHERE is_active = true;
```

### Step 3: Test Send Email

1. Refresh browser (Ctrl+Shift+R)
2. Go to **Participants** tab
3. Klik icon email pada participant
4. Send test email

**Should work now!** ✅

---

## 🐛 Troubleshooting

### Still Error 500?

Check **Supabase Edge Function Logs**:

1. Buka https://supabase.com/dashboard/project/[your-project]/logs/edge-functions
2. Filter: `send-email`
3. Cari error message

**Common errors:**

#### "No active email configuration found"
```sql
-- Activate a config
UPDATE email_config SET is_active = true WHERE id = 'your-config-id';
```

#### "Multiple rows returned"
```sql
-- Only 1 config should be active
UPDATE email_config SET is_active = false WHERE is_active = true;
UPDATE email_config SET is_active = true WHERE id = 'your-preferred-config-id';
```

### SMTP Connection Error?

Jika edge function sukses load config tapi gagal connect ke SMTP:

**Untuk port 465 (SSL):**
```
smtp_secure = true
smtp_port = 465
```

**Untuk port 587 (TLS/STARTTLS):**
```
smtp_secure = false  
smtp_port = 587
```

**Untuk port 25 (unencrypted):**
```
smtp_secure = false
smtp_port = 25
```

**Gmail always use:**
```
smtp_host = smtp.gmail.com
smtp_port = 587
smtp_secure = false  (it will upgrade to TLS automatically)
```

### Test SMTP Settings di Email Settings Tab

1. Edit config SMTP Anda
2. Pastikan:
   - SMTP Host: `uranus.webmail.co.id` (dari screenshot)
   - SMTP Port: `465` atau `587`
   - SMTP Secure: 
     - `true` untuk port 465
     - `false` untuk port 587
   - Username: `event@werkudaratravel.com`
   - Password: [your password]
3. Klik **Update**
4. Klik **Activate**
5. Test dengan **Send Test Email**

---

## 📋 Quick Checklist

Copy dan cek satu-satu:

```
[ ] Edge function sudah di-redeploy
[ ] Ada 1 config dengan is_active = true
[ ] SMTP settings benar (host, port, username, password)
[ ] Port dan secure setting match (465=true, 587=false)
[ ] Browser sudah di-refresh
[ ] Test send email dari UI
```

---

## 🎓 Port & Security Reference

| Port | Secure Setting | Protocol | Use Case |
|------|---------------|----------|----------|
| 25 | `false` | Unencrypted | Legacy, often blocked |
| 587 | `false` | STARTTLS | **Recommended** (Gmail, most hosts) |
| 465 | `true` | SSL/TLS | Alternative, some hosts |
| 2525 | `false` | STARTTLS | Backup port (Mailgun, etc) |

**Gmail selalu gunakan:**
- Port: `587`
- Secure: `false`
- Protocol: STARTTLS (auto-upgrade dari plaintext)

**cPanel/Hosting biasanya:**
- Port: `465` (SSL) atau `587` (TLS)
- Secure: `true` untuk 465, `false` untuk 587

---

## ✅ Verification

Setelah fix, edge function logs should show:

```
[send-email] Active config loaded. Provider: smtp ID: xxx-xxx-xxx
[SMTP] Connecting to: uranus.webmail.co.id port: 465
[SMTP] Creating client...
✅ Email sent successfully
```

Jika muncul log ini → **Email berhasil terkirim!** 🎉

---

**File Updated**: 
- `supabase/functions/send-email/index.ts` (fixed config query)

**Action Required**:
1. Redeploy edge function
2. Verify active config
3. Test send email

**Time to Fix**: ~2 menit
