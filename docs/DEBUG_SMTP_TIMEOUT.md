# 🧪 Test SMTP di Supabase - Step by Step

## Error yang Anda Alami

```
Error sending email: Email sending timeout after 30 seconds
```

**Artinya**: SMTP server tidak merespons. Kemungkinan:
1. ❌ SMTP host/port salah
2. ❌ Username/password salah
3. ❌ smtp_secure setting tidak match dengan port
4. ❌ Firewall/network block

---

## 🔍 Step 1: Check Config di Supabase

### 1.1 Buka Supabase SQL Editor

https://supabase.com/dashboard/project/[your-project]/sql

### 1.2 Run Query Diagnostic

Copy-paste ini:

```sql
-- Check active config
SELECT 
  id,
  config_name,
  provider,
  smtp_host,
  smtp_port,
  smtp_username,
  LEFT(smtp_password, 3) || '***' as password_preview,
  smtp_secure,
  sender_email,
  is_active
FROM email_config
WHERE is_active = true;
```

**Check hasil:**
- ✅ Ada 1 row?
- ✅ `smtp_host` = `uranus.webmail.co.id`?
- ✅ `smtp_port` = `465` atau `587`?
- ✅ `smtp_secure` match dengan port? (465=true, 587=false)
- ✅ `smtp_username` benar?
- ✅ Password ada (bukan NULL)?

---

## 🔧 Step 2: Fix SMTP Settings

### Option A: Port 465 (SSL) - RECOMMENDED untuk cPanel

```sql
-- Ganti 'your-config-id' dengan ID dari query di atas
UPDATE email_config
SET 
  smtp_host = 'uranus.webmail.co.id',
  smtp_port = 465,
  smtp_secure = true,  -- PENTING: true untuk port 465
  smtp_username = 'event@werkudaratravel.com',
  smtp_password = 'YOUR_ACTUAL_PASSWORD',  -- Ganti dengan password asli
  sender_email = 'event@werkudaratravel.com',
  sender_name = 'WAM 2025 Registration'
WHERE id = 'your-config-id';

-- Verify
SELECT smtp_host, smtp_port, smtp_secure, smtp_username 
FROM email_config 
WHERE is_active = true;
```

### Option B: Port 587 (TLS)

```sql
UPDATE email_config
SET 
  smtp_host = 'uranus.webmail.co.id',
  smtp_port = 587,
  smtp_secure = false,  -- PENTING: false untuk port 587
  smtp_username = 'event@werkudaratravel.com',
  smtp_password = 'YOUR_ACTUAL_PASSWORD',
  sender_email = 'event@werkudaratravel.com',
  sender_name = 'WAM 2025 Registration'
WHERE id = 'your-config-id';
```

---

## 🧪 Step 3: Test via Edge Function Logs

### 3.1 Send Test Email dari UI

1. Refresh browser (Ctrl+Shift+R)
2. Klik icon email pada participant
3. Send email

### 3.2 Check Logs Immediately

Buka: https://supabase.com/dashboard/project/[your-project]/logs/edge-functions

Filter: `send-email`

**Cari log ini:**

#### ✅ Success Pattern:
```
[send-email] Active config loaded. Provider: smtp ID: xxx
[SMTP] Connecting to: uranus.webmail.co.id port: 465
[SMTP] Creating client...
[SMTP] Client created, preparing email...
✅ Email sent successfully
```

#### ❌ Error Patterns:

**Pattern 1: Connection Timeout**
```
[SMTP] Connecting to: uranus.webmail.co.id port: 465
Error: Connection timeout
```
**Fix**: Port/host salah atau firewall block

**Pattern 2: Authentication Failed**
```
[SMTP] Connecting to: uranus.webmail.co.id
Error: Authentication failed
```
**Fix**: Username/password salah

**Pattern 3: TLS Error**
```
[SMTP] Connecting to: uranus.webmail.co.id
Error: TLS handshake failed
```
**Fix**: smtp_secure setting salah (coba toggle true/false)

---

## 🎯 Step 4: Alternative - Switch to Gmail (Quick Test)

Jika SMTP terus gagal, test dulu dengan Gmail untuk verify system works:

### 4.1 Check Gmail Config

```sql
SELECT id, config_name, gmail_email, is_active
FROM email_config
WHERE provider = 'gmail';
```

### 4.2 Activate Gmail

```sql
-- Deactivate SMTP
UPDATE email_config SET is_active = false WHERE provider = 'smtp';

-- Activate Gmail
UPDATE email_config SET is_active = true WHERE provider = 'gmail';

-- Verify
SELECT config_name, provider, is_active FROM email_config;
```

### 4.3 Test Send Email

Refresh browser → Send test email.

**Jika Gmail works** → Berarti system OK, masalahnya di SMTP settings.

**Jika Gmail juga gagal** → Check edge function deployment.

---

## 🔍 Step 5: Deep Debug - Manual SMTP Test

### Test SMTP Connection Manual (di komputer lokal)

Install telnet/openssl dan test:

```powershell
# Test port 465 (SSL)
Test-NetConnection -ComputerName uranus.webmail.co.id -Port 465

# Test port 587 (TLS)
Test-NetConnection -ComputerName uranus.webmail.co.id -Port 587

# Test port 25
Test-NetConnection -ComputerName uranus.webmail.co.id -Port 25
```

**Hasil:**
- ✅ `TcpTestSucceeded : True` → Port terbuka, bisa digunakan
- ❌ `TcpTestSucceeded : False` → Port tertutup/blocked

---

## 📋 Checklist Troubleshooting

```
[ ] Query #1 dijalankan - ada active config
[ ] smtp_host benar: uranus.webmail.co.id
[ ] smtp_port: 465 atau 587
[ ] smtp_secure: true (untuk 465) atau false (untuk 587)
[ ] smtp_username: event@werkudaratravel.com
[ ] smtp_password: diisi (bukan NULL)
[ ] Browser di-refresh setelah update
[ ] Edge function logs dicek
[ ] Test connection port dari lokal (opsional)
```

---

## 🆘 Quick Win - Common Fixes

### Fix 1: Port Mismatch
```sql
-- Port 465 HARUS secure=true
UPDATE email_config 
SET smtp_port = 465, smtp_secure = true 
WHERE is_active = true AND provider = 'smtp';
```

### Fix 2: Port 587 Alternative
```sql
-- Coba port 587 (lebih universal)
UPDATE email_config 
SET smtp_port = 587, smtp_secure = false 
WHERE is_active = true AND provider = 'smtp';
```

### Fix 3: Verify Password Not NULL
```sql
-- Check password ada
SELECT 
  id, 
  CASE WHEN smtp_password IS NULL THEN '❌ NULL' ELSE '✅ Set' END as password_status
FROM email_config 
WHERE is_active = true;

-- If NULL, update:
UPDATE email_config 
SET smtp_password = 'your-actual-password'
WHERE id = 'your-config-id';
```

---

## 📊 Port Reference Table

| Port | Secure | Protocol | Success Rate |
|------|--------|----------|--------------|
| 465 | `true` | SSL/TLS | ⭐⭐⭐⭐ High (cPanel) |
| 587 | `false` | STARTTLS | ⭐⭐⭐⭐⭐ Highest (Gmail, most) |
| 25 | `false` | Plain | ⭐ Low (often blocked) |
| 2525 | `false` | STARTTLS | ⭐⭐⭐ Medium (backup) |

**Recommendation untuk uranus.webmail.co.id:**
1. Try: Port `465` + Secure `true`
2. If fail, try: Port `587` + Secure `false`

---

## ✅ Success Indicators

Setelah fix, check:

1. **Supabase Edge Logs** show:
   ```
   ✅ Email sent successfully
   ```

2. **Participant inbox** terima email

3. **Console UI** show:
   ```
   ✅ Email sent to hanungsastriya@gmail.com
   ```

---

**File untuk Test**: `TEST_SMTP_IN_SUPABASE.sql`
**Time to Debug**: ~5-10 menit
**Success Rate setelah fix**: 95%+

Coba steps di atas dan screenshot:
1. Hasil query config
2. Edge function logs
3. Error message (jika masih ada)
