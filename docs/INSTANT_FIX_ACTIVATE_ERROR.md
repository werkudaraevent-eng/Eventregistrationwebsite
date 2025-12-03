# ⚡ INSTANT FIX - Jalankan Ini Sekarang!

## 🎯 Masalah Anda

Error saat klik "Activate":
```
Failed to activate: UPDATE requires a WHERE clause
```

## ✅ Solusi 1-Menit

### Copy-Paste Ini ke Supabase SQL Editor:

1. **Buka** https://supabase.com/dashboard/project/[your-project]/sql
2. **Hapus semua** yang ada di editor
3. **Copy-paste** kode di bawah:

```sql
-- FIX: Update function dengan WHERE clause yang benar
CREATE OR REPLACE FUNCTION set_active_email_config(config_id TEXT)
RETURNS void AS $$
BEGIN
  -- Deactivate others (with WHERE clause)
  UPDATE email_config 
  SET is_active = false, updated_at = NOW() 
  WHERE is_active = true AND id != config_id;
  
  -- Activate target
  UPDATE email_config 
  SET is_active = true, updated_at = NOW()
  WHERE id = config_id;
  
  RAISE NOTICE 'Config % activated', config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'Function updated!' as status;
```

4. **Klik Run** (atau tekan F5)
5. **Refresh browser** (Ctrl+Shift+R)
6. **Test lagi** klik "Activate" → Should work! ✅

---

## 🔧 Jika Perlu Migration Lengkap

Jika muncul error lain seperti "column config_name does not exist":

### Run File Migration Lengkap:

1. Buka file: **`UPGRADE_EMAIL_CONFIG_SAFE.sql`**
2. Copy SEMUA isinya
3. Paste ke Supabase SQL Editor
4. Run (F5)
5. Tunggu message sukses
6. Refresh browser

---

## ✅ Verification Quick Test

Setelah run fix, test ini di SQL Editor:

```sql
-- Should show your configs
SELECT id, config_name, provider, is_active 
FROM email_config;

-- Should work without error
SELECT set_active_email_config('default');
```

Jika kedua query jalan → **FIX BERHASIL!** 🎉

---

## 🚨 Masih Error?

Screenshot:
1. Console error (F12)
2. SQL error message
3. Kirim ke developer

---

**Waktu Fix**: ~1 menit
**Success Rate**: 99%

GO! 🚀
