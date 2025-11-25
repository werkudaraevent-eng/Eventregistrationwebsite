# 🚨 FIX EMAIL BLAST ERROR - Setup Database

## Error yang Anda Alami:
```
POST https://...supabase.co/functions/v1/send-email 500 (Internal Server Error)
FunctionsHttpError: Edge Function returned a non-2xx status code
```

**Penyebab:** Table `email_config` belum ada di database Supabase.

---

## ✅ Solusi: Jalankan SQL Berikut

### Step 1: Buka Supabase SQL Editor

1. Buka browser → https://supabase.com
2. Login dan pilih project Anda
3. Di sidebar kiri, klik **"SQL Editor"**
4. Klik **"New query"**

### Step 2: Copy & Paste SQL Ini

```sql
-- Create table for email configuration
CREATE TABLE IF NOT EXISTS email_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  provider TEXT NOT NULL DEFAULT 'smtp',
  
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read email_config" ON email_config;
DROP POLICY IF EXISTS "Allow update email_config for authenticated users" ON email_config;

-- Policy: Anyone can read email config (needed for edge function)
CREATE POLICY "Allow read email_config" ON email_config
  FOR SELECT USING (true);

-- Policy: Only authenticated users can update
CREATE POLICY "Allow update email_config for authenticated users" ON email_config
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Drop function if exists
DROP FUNCTION IF EXISTS update_email_config_updated_at() CASCADE;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS email_config_updated_at ON email_config;

-- Trigger to auto-update updated_at
CREATE TRIGGER email_config_updated_at
  BEFORE UPDATE ON email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_email_config_updated_at();
```

### Step 3: Run SQL

1. Klik tombol **"Run"** (atau tekan F5)
2. Tunggu sampai selesai
3. Seharusnya muncul: **"Success. No rows returned"**

---

## ✅ Setelah SQL Berhasil

### 1. Refresh Halaman Email Configuration
- Buka tab **"Email Settings"** di admin dashboard
- Refresh halaman (F5)
- Error di console akan hilang

### 2. Isi Konfigurasi Email Anda

**General Settings:**
- Sender Name: `Event Registration System` (atau nama Anda)
- Sender Email: Email Anda (contoh: `event@utamakalpana.com`)
- Email service active: ON (toggle hijau)

**Provider Settings (SMTP):**
- SMTP Host: `smtp.gmail.com` (untuk Gmail)
- SMTP Port: `587`
- SMTP Username: Email lengkap Anda (contoh: `hanungsastria13@gmail.com`)
- SMTP Password: **App Password** dari Google (BUKAN password Gmail biasa!)

### 3. Save Configuration

- Klik **"💾 Save General Settings"** (tombol purple)
- Klik **"🔧 Save Provider Settings"** (tombol biru)

### 4. Test Email

- Scroll ke bawah ke section "Test Email Configuration"
- Masukkan email Anda di form
- Klik **"Send Test Email"**
- Cek inbox Anda

---

## 🔑 Cara Buat Gmail App Password

Karena Anda pakai Gmail (`hanungsastria13@gmail.com`), Anda HARUS pakai App Password:

1. Buka https://myaccount.google.com/apppasswords
2. Login dengan akun Gmail Anda
3. **Jika belum ada:** Aktifkan **2-Step Verification** dulu
4. Klik **"Select app"** → Pilih **"Mail"**
5. Klik **"Select device"** → Pilih **"Other"** → Ketik: `Event System`
6. Klik **"Generate"**
7. **Copy password 16 karakter** yang muncul (contoh: `abcd efgh ijkl mnop`)
8. Paste ke field **"SMTP Password"** di website

⚠️ **PENTING:** Password ini hanya muncul sekali! Simpan di tempat aman.

---

## 🧪 Test Email Blast

Setelah konfigurasi tersimpan:

1. Buka tab **"Blast"** di admin dashboard
2. Buat campaign baru
3. Pilih participants
4. Tulis email
5. Send
6. Email seharusnya terkirim tanpa error!

---

## ❓ Troubleshooting

### Error tetap 500 setelah jalankan SQL
→ Pastikan SQL berhasil. Cek di **Table Editor** → cari table `email_config`

### Email tidak terkirim
→ Cek konfigurasi:
- SMTP Username harus email lengkap
- SMTP Password harus App Password (bukan password Gmail)
- Port 587 atau coba 465

### Error "Authentication failed"
→ App Password salah. Generate ulang App Password baru.

### Email masuk spam
→ Normal untuk awal. Mark as "Not Spam" beberapa kali.

---

## ✅ Quick Checklist

- [ ] SQL sudah dijalankan di Supabase
- [ ] Table `email_config` sudah ada
- [ ] Gmail App Password sudah dibuat
- [ ] Konfigurasi SMTP sudah disave
- [ ] Test email berhasil terkirim
- [ ] Email blast berfungsi tanpa error 500

Setelah semua checklist ✅, email blast akan berfungsi dengan baik! 🎉
