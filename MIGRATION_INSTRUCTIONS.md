# 🚨 PENTING: Jalankan SQL Migration Ini Dulu!

## Cara Menjalankan Migration

### 1. Buka Supabase Dashboard
- Login ke https://supabase.com/dashboard
- Pilih project Anda: `xtrognfmzyzqhsfvtgne`

### 2. Buka SQL Editor
- Klik **SQL Editor** di menu sidebar kiri
- Atau langsung ke: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne/sql

### 3. Copy & Paste SQL Berikut

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

### 4. Klik "Run" atau tekan Ctrl+Enter

### 5. Verifikasi
- Setelah berhasil, Anda akan melihat pesan sukses
- Buka **Table Editor** di sidebar
- Pastikan tabel `email_templates` sudah muncul

## ✅ Setelah Migration Berhasil

1. Refresh browser Anda (Ctrl+F5)
2. Login ke Admin Dashboard
3. Pilih event
4. Klik tab **"Email Templates"**
5. Mulai membuat template email!

## 🎨 Fitur Baru yang Tersedia

### Rich Text Editor Toolbar
- **Bold**: Membuat teks tebal dengan `<strong>text</strong>`
- **Italic**: Membuat teks miring dengan `<em>text</em>`
- **Link**: Insert hyperlink dengan `<a href="url">text</a>`

### Quick Insert Placeholders
- Tombol cepat untuk insert: Name, Email, Event Name, Company
- Tinggal klik tombol dan placeholder akan masuk ke cursor position

### Visual / HTML Mode
- **Visual Mode**: Edit dengan tampilan normal
- **HTML Mode**: Edit dengan HTML tags (untuk advanced users)

### Contoh Template

**Name:** Welcome Email
**Type:** Registration Confirmation

**Subject:**
```
Selamat! Anda Terdaftar di {{event_name}}
```

**Body (Visual Mode):**
```
Dear {{name}},

Terima kasih telah mendaftar untuk {{event_name}}!

Detail Event:
📅 Tanggal: {{event_date}}
📍 Lokasi: {{event_location}}

Kami menantikan kehadiran Anda dari {{company}}.

Salam,
Tim Event
```

**Body (HTML Mode):**
```html
<p>Dear <strong>{{name}}</strong>,</p>

<p>Terima kasih telah mendaftar untuk <strong>{{event_name}}</strong>!</p>

<p><strong>Detail Event:</strong></p>
<ul>
  <li>📅 Tanggal: {{event_date}}</li>
  <li>📍 Lokasi: {{event_location}}</li>
</ul>

<p>Kami menantikan kehadiran Anda dari <em>{{company}}</em>.</p>

<p>Salam,<br>
Tim Event</p>
```

## ❓ Troubleshooting

**Masalah: Error "Could not find table email_templates"**
- Solusi: Pastikan SQL migration sudah dijalankan dengan sukses

**Masalah: Tab Email Templates tidak muncul**
- Solusi: Refresh browser (Ctrl+F5), logout dan login kembali

**Masalah: Error saat save template**
- Solusi: Pastikan semua field (Name, Subject, Body) sudah terisi

**Masalah: Formatting tidak bekerja**
- Solusi: Pastikan menggunakan HTML tags yang benar. Cek di tab HTML mode.
