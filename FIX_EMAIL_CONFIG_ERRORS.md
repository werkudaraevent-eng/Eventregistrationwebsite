# 🔧 Quick Fix - Email Multi-Provider Errors

## Error yang Terjadi

Dari screenshot dan console:
1. ❌ **"Failed to activate: UPDATE requires a WHERE clause"**
2. ❌ **"500 Internal Server Error"** saat send email
3. ❌ **"function does not exist"** error

## ✅ Solusi Cepat (2 Menit)

### Step 1: Run Migration yang Benar

**JANGAN run file lama!** Gunakan yang baru:

1. Buka **Supabase Dashboard** → SQL Editor
2. **HAPUS semua** di editor
3. Copy-paste isi file: **`UPGRADE_EMAIL_CONFIG_SAFE.sql`**
4. Klik **Run** (F5)
5. Tunggu sampai muncul pesan sukses

```
✅ ================================
✅ Migration completed successfully!
✅ ================================
```

### Step 2: Verify di Database

Jalankan query ini untuk verify:

```sql
-- Check columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'email_config'
ORDER BY ordinal_position;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('set_active_email_config', 'duplicate_email_config');
```

Expected result:
- ✅ Column `config_name` exists
- ✅ Column `last_tested_at` exists
- ✅ Function `set_active_email_config` exists
- ✅ Function `duplicate_email_config` exists

### Step 3: Refresh Browser

```bash
# Hard refresh
Ctrl + Shift + R (Chrome/Edge)
# atau
Ctrl + F5
```

### Step 4: Test di UI

1. Go to **Email Settings** tab
2. Klik **"New Configuration"**
3. Isi form dan save
4. Klik **"Activate"** → should work now! ✅

---

## 🐛 Jika Masih Error

### Error: "Column config_name does not exist"

**Penyebab**: Migration belum jalan
**Solusi**: Ulangi Step 1 dengan file `UPGRADE_EMAIL_CONFIG_SAFE.sql`

### Error: "Function set_active_email_config does not exist"

**Penyebab**: Function belum di-create
**Solusi**: Run query manual:

```sql
CREATE OR REPLACE FUNCTION set_active_email_config(config_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE email_config 
  SET is_active = false, updated_at = NOW() 
  WHERE is_active = true AND id != config_id;
  
  UPDATE email_config 
  SET is_active = true, updated_at = NOW()
  WHERE id = config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Error: "UPDATE requires WHERE clause" (sudah fix di function baru)

**Penyebab**: Function lama tanpa WHERE clause
**Solusi**: Drop dan recreate function:

```sql
DROP FUNCTION IF EXISTS set_active_email_config(TEXT);

-- Then run the CREATE FUNCTION above
```

### Error: "500 Internal Server Error" saat send email

**Penyebab**: Edge function masih cari config dengan cara lama
**Solusi**: Pastikan ada 1 config yang `is_active = true`:

```sql
-- Manual set active
UPDATE email_config 
SET is_active = true 
WHERE id = 'default';
```

---

## 📋 Checklist Troubleshooting

Copy checklist ini dan cek satu-satu:

```
[ ] Migration UPGRADE_EMAIL_CONFIG_SAFE.sql sudah dijalankan
[ ] Column config_name ada di table email_config
[ ] Function set_active_email_config exists
[ ] Function duplicate_email_config exists
[ ] Browser sudah di-refresh (hard refresh)
[ ] Ada minimal 1 config dengan is_active = true
[ ] Dev server sudah di-restart
```

---

## 🔍 Debug Console Logs

Sekarang component sudah log detail. Check console:

```javascript
[EmailConfigV2] Setting active config: xxx-xxx-xxx
[EmailConfigV2] RPC response: { data: ..., error: ... }
```

Jika ada error, screenshot console dan share!

---

## 🆘 Nuclear Option (Reset Everything)

Jika semua gagal, reset email_config table:

```sql
-- BACKUP DATA DULU!
SELECT * FROM email_config; -- Copy hasil ini!

-- Drop table
DROP TABLE IF EXISTS email_config CASCADE;

-- Run migration fresh
-- Copy-paste: supabase/migrations/009_create_email_config.sql
-- Then run: UPGRADE_EMAIL_CONFIG_SAFE.sql
```

---

## ✅ Verification Commands

Setelah fix, run ini untuk verify:

```sql
-- 1. Show all configs
SELECT id, config_name, provider, is_active, sender_email
FROM email_config
ORDER BY is_active DESC;

-- 2. Test function
SELECT set_active_email_config('your-config-id-here');

-- 3. Verify active
SELECT * FROM email_config WHERE is_active = true;
```

Expected:
- ✅ List configs muncul
- ✅ Function jalan tanpa error
- ✅ Exactly 1 config is_active = true

---

**File Migration yang Benar**: `UPGRADE_EMAIL_CONFIG_SAFE.sql`
**Component Updated**: `EmailConfigurationV2.tsx` (sudah auto-update)
**Time to Fix**: ~2 menit

Kalau masih error setelah ini, screenshot console log dan kirim! 🚀
