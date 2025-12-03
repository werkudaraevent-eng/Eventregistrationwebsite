# 🚨 FIX: Could not find 'include_qr_code' column

## Error:
```
Could not find the 'include_qr_code' column of 'email_templates' in the schema cache
```

## ✅ Solusi: Run Migration SQL

### Step 1: Buka Supabase SQL Editor
**SQL Editor sudah dibuka di Simple Browser** atau buka manual:
https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne/sql/new

### Step 2: Copy-Paste SQL Ini

```sql
-- Add include_qr_code column to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS include_qr_code BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN email_templates.include_qr_code IS 'Whether to include participant QR code as attachment when sending email';

-- Set default to false for existing records
UPDATE email_templates SET include_qr_code = false WHERE include_qr_code IS NULL;
```

### Step 3: Run Query
1. **Klik "Run"** (atau Ctrl+Enter)
2. Tunggu sampai muncul **"Success"**

### Step 4: Verify Column Created
Run query ini untuk verify:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'email_templates' 
AND column_name = 'include_qr_code';
```

Hasil yang benar:
```
column_name      | data_type | column_default
-----------------+-----------+---------------
include_qr_code  | boolean   | false
```

### Step 5: Refresh Aplikasi
1. **Kembali ke localhost:3000**
2. **Refresh browser** (F5)
3. **Coba edit template lagi** → Error hilang! ✅

---

## Quick Test

Setelah migration, test dengan:
1. Edit template yang sudah ada
2. Centang "📱 Include Participant QR Code"
3. Save → Berhasil!
4. Template card muncul purple badge "📱 QR Code Enabled"

---

**Quick Link**: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne/sql/new
