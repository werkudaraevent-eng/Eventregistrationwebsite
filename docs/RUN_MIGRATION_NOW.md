# 🚨 FIX ERROR: Table 'email_templates' Not Found

## Error yang Muncul:
```
Could not find the table 'public.email_templates' in the schema cache
```

## Solusi - Jalankan Migration Manual (5 menit)

### Step 1: Buka Supabase Dashboard
1. Buka browser, kunjungi: **https://supabase.com/dashboard**
2. Login dengan akun Supabase kamu
3. Pilih project: **xtrognfmzyzqhsfvtgne** (atau nama project kamu)

### Step 2: Buka SQL Editor
1. Klik **"SQL Editor"** di sidebar kiri
2. Klik tombol **"New query"** (di pojok kanan atas)

### Step 3: Paste SQL Migration
Copy SQL berikut dan paste ke SQL Editor:

```sql
-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration_confirmation', 'reminder', 'custom')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_templates_event_id ON email_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);

-- Enable Row Level Security
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - adjust based on your auth setup)
CREATE POLICY "Allow all operations on email_templates" ON email_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates for participant communication';
```

### Step 4: Run Query
1. Klik tombol **"Run"** (Ctrl+Enter) di pojok kanan bawah
2. Tunggu sampai muncul "Success. No rows returned"
3. ✅ Selesai!

### Step 5: Verify Table Created
1. Di sidebar kiri, klik **"Table Editor"**
2. Kamu harus melihat table baru: **email_templates**
3. Klik table tersebut untuk melihat struktur columns

### Step 6: Refresh Aplikasi
1. Kembali ke aplikasi kamu (localhost:3000)
2. **Refresh browser** (F5 atau Ctrl+R)
3. Coba create email template lagi
4. ✅ Error seharusnya sudah hilang!

---

## Alternative: Cek via Table Editor

Setelah migration, kamu bisa verify dengan:
1. Go to **Table Editor**
2. Select **email_templates** table
3. Columns harus ada:
   - `id` (uuid)
   - `event_id` (text)
   - `name` (text)
   - `subject` (text)
   - `body` (text)
   - `type` (text)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

---

## Troubleshooting

### Jika masih error "table not found" setelah migration:
1. **Clear browser cache**: Ctrl+Shift+R
2. **Restart dev server**: 
   ```bash
   # Stop server (Ctrl+C di terminal)
   npm run dev
   ```
3. **Check di Supabase Dashboard** apakah table benar-benar sudah ada

### Jika muncul error "relation already exists":
✅ Ini bagus! Artinya table sudah dibuat sebelumnya. Tinggal refresh aplikasi.

### Jika error "permission denied":
Pastikan kamu login sebagai **owner** project di Supabase Dashboard.

---

## Quick Link
🔗 **Supabase Dashboard**: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne

Setelah selesai, langsung test create email template! 🎉
