# ✅ SMTP Secure Toggle - UI Update

## 🎯 Fitur Baru

Sekarang Anda bisa **ON/OFF SMTP Secure** langsung dari UI Email Settings!

## 🎨 Tampilan Baru

Di **Email Settings** → **SMTP tab**, sekarang ada:

### 1. Toggle Switch "SMTP Secure (SSL/TLS)"
- **ON** → Port 465 (SSL/TLS from start)
- **OFF** → Port 587 (STARTTLS - upgrades to TLS)

### 2. Visual Guide
Otomatis muncul hint:
- Jika ON: "✅ Use for port 465"
- Jika OFF: "✅ Use for port 587"

### 3. Quick Reference Box
Blue box dengan panduan:
```
💡 Quick Guide:
• Port 465 → SMTP Secure ON (SSL/TLS from start)
• Port 587 → SMTP Secure OFF (STARTTLS - upgrades to TLS)
• Port 25 → SMTP Secure OFF (often blocked by ISP)
```

## 🚀 Cara Pakai

### Setup SMTP untuk uranus.webmail.co.id

1. **Buka Email Settings** tab
2. **Klik Edit** pada config SMTP Anda
3. **Isi form:**
   ```
   SMTP Host: uranus.webmail.co.id
   SMTP Port: 465
   SMTP Secure: ON (toggle ke kanan) ← PENTING!
   SMTP Username: event@werkudaratravel.com
   SMTP Password: Yogyakarta#2025
   Sender Email: event@werkudaratravel.com
   Sender Name: WAM 2025 Registration
   ```
4. **Klik Update**
5. **Klik Activate** (jika belum aktif)
6. **Test send email**

### Alternative Port 587

Jika port 465 tidak work, coba:
```
SMTP Port: 587
SMTP Secure: OFF (toggle ke kiri) ← Penting!
```

## 🎯 Port vs Secure - Reference

| Port | SMTP Secure | Protocol | Use Case |
|------|-------------|----------|----------|
| 465 | **ON** | SSL/TLS | ⭐⭐⭐⭐ cPanel hosting |
| 587 | **OFF** | STARTTLS | ⭐⭐⭐⭐⭐ Gmail, universal |
| 25 | **OFF** | Plain | ⭐ Legacy (avoid) |
| 2525 | **OFF** | STARTTLS | ⭐⭐⭐ Backup port |

## ✅ Default Values

Saat create **New Configuration**:
- SMTP Port: `587`
- SMTP Secure: `OFF`

Anda bisa langsung ubah sesuai kebutuhan.

## 🐛 Fix untuk Error Sebelumnya

Sekarang:
- ✅ SMTP Secure **tidak akan NULL** lagi
- ✅ Default value `false` (OFF)
- ✅ Toggle visual di UI
- ✅ Auto-save saat Update config

## 🔄 Update Existing Config

Jika config lama masih punya `smtp_secure = NULL`:

**Option A: Via UI (Recommended)**
1. Edit config di Email Settings
2. Toggle SMTP Secure ON/OFF
3. Klik Update
4. ✅ Fixed!

**Option B: Via SQL**
```sql
UPDATE email_config 
SET smtp_secure = true  -- atau false
WHERE provider = 'smtp';
```

## 📝 Component Changes

**File**: `src/components/EmailConfigurationV2.tsx`

**Added**:
- Toggle Switch untuk SMTP Secure
- Visual hints (ON/OFF label)
- Quick guide box
- Default values (smtp_secure: false, smtp_port: 587)

**UI Flow**:
```
User toggles switch → 
  Config updated in state → 
    User clicks Update → 
      Saved to database with proper boolean value → 
        No more NULL! ✅
```

---

**Status**: ✅ Live
**Testing**: Refresh browser dan buka Email Settings
**Impact**: No more SMTP timeout errors due to NULL smtp_secure!
