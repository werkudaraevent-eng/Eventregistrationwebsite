# 🚨 PENTING: Jalankan Migration Ini Dulu!

## Error yang Anda lihat:
```
Error loading email config: Object
```

Ini karena table `email_config` belum ada di database Supabase.

## ✅ Solusi: Jalankan Migration

### Cara 1: Via Supabase Dashboard (Paling Mudah)

1. **Buka Supabase Dashboard**
   - https://supabase.com
   - Login dan pilih project Anda

2. **Buka SQL Editor**
   - Klik **"SQL Editor"** di sidebar kiri
   - Atau langsung ke: `https://supabase.com/dashboard/project/YOUR-PROJECT/sql/new`

3. **Copy & Paste SQL ini:**

```sql
-- Create table for email configuration
CREATE TABLE IF NOT EXISTS email_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  provider TEXT NOT NULL DEFAULT 'smtp', -- 'smtp', 'sendgrid', 'gmail', 'mailgun'
  
  -- SMTP Settings
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  smtp_secure BOOLEAN DEFAULT false,
  
  -- SendGrid Settings
  sendgrid_api_key TEXT,
  
  -- Gmail OAuth (future)
  gmail_client_id TEXT,
  gmail_client_secret TEXT,
  gmail_refresh_token TEXT,
  
  -- Mailgun Settings
  mailgun_api_key TEXT,
  mailgun_domain TEXT,
  
  -- General Settings
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'Event Registration System',
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO email_config (id, provider, sender_email, sender_name)
VALUES ('default', 'smtp', 'noreply@yourdomain.com', 'Event Registration System')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read email config (needed for edge function)
CREATE POLICY "Allow read email_config" ON email_config
  FOR SELECT USING (true);

-- Policy: Only authenticated users can update
CREATE POLICY "Allow update email_config for authenticated users" ON email_config
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER email_config_updated_at
  BEFORE UPDATE ON email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_email_config_updated_at();
```

4. **Klik tombol "Run" (atau tekan F5)**

5. **Tunggu sampai muncul**:
   ```
   Success. No rows returned
   ```

6. **Refresh halaman Email Configuration di website Anda**

---

### Cara 2: Via Supabase CLI (Advanced)

```powershell
# Di terminal/PowerShell
cd D:\Github\Eventregistrationwebsite

# Push migration
npx supabase db push
```

---

## ✅ Setelah Migration Berhasil

1. **Refresh halaman** Email Configuration
2. **Error akan hilang**
3. **Tombol "💾 Save Configuration"** akan terlihat di kanan atas (warna purple-pink)
4. **Isi form** sesuai provider email Anda
5. **Klik Save**
6. **Test kirim email**

---

## 🔍 Cara Cek Migration Berhasil

Di Supabase Dashboard:
1. Klik **"Table Editor"** di sidebar
2. Cari table **"email_config"**
3. Seharusnya ada 1 row dengan id "default"

Atau via SQL Editor, jalankan:
```sql
SELECT * FROM email_config;
```

Seharusnya muncul 1 baris data default.

---

## ❓ Troubleshooting

### Error: "relation email_config does not exist"
→ Migration belum jalan. Ulangi langkah di atas.

### Error: "permission denied"
→ Pastikan Anda sudah login sebagai admin/owner project.

### Table sudah ada tapi error tetap muncul
→ Refresh halaman web (Ctrl+F5) atau clear cache browser.

---

Setelah migration berhasil, tombol Save akan muncul dan Anda bisa mulai konfigurasi email! 🎉
