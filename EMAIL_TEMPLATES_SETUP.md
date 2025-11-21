# Email Templates Feature - Setup Instructions

## Database Migration

Fitur Email Templates memerlukan tabel baru di database Supabase. Anda perlu menjalankan SQL migration berikut:

### Opsi 1: Via Supabase CLI (Recommended)

```bash
npx supabase db push --include-all
```

### Opsi 2: Via Supabase Dashboard SQL Editor

Jika ada masalah koneksi dengan CLI, buka **Supabase Dashboard** > **SQL Editor** dan jalankan query berikut:

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

## Fitur Email Templates

### Lokasi Tab
Tab **Email Templates** bisa diakses di **Admin Dashboard** setelah memilih event, di sebelah tab Branding.

### Fitur Utama

1. **Create Email Template**
   - Buat template email baru dengan nama, subject, dan body
   - Pilih tipe template: Registration Confirmation, Reminder, atau Custom
   
2. **Edit Template**
   - Edit template yang sudah ada
   - Update nama, subject, body, atau tipe
   
3. **Duplicate Template**
   - Duplikasi template untuk membuat variasi baru dengan cepat
   
4. **Delete Template**
   - Hapus template yang tidak dibutuhkan

### Placeholders Available

Gunakan placeholder berikut di subject dan body email:

- `{{name}}` - Nama participant
- `{{email}}` - Email participant
- `{{event_name}}` - Nama event
- `{{event_date}}` - Tanggal event
- `{{event_location}}` - Lokasi event
- `{{company}}` - Company participant

### Contoh Template

**Subject:**
```
Konfirmasi Pendaftaran {{event_name}}
```

**Body:**
```
Dear {{name}},

Terima kasih telah mendaftar untuk {{event_name}}!

Detail Event:
- Tanggal: {{event_date}}
- Lokasi: {{event_location}}

Kami menantikan kehadiran Anda.

Salam,
Tim Event
```

## Next Steps

Setelah migration berhasil dijalankan:

1. Login ke Admin Dashboard
2. Pilih event
3. Klik tab "Email Templates"
4. Buat template email pertama Anda
5. Gunakan template untuk blast email ke peserta

## Troubleshooting

Jika tab Email Templates tidak muncul:
1. Pastikan migration sudah dijalankan dengan sukses
2. Refresh browser (Ctrl+F5)
3. Logout dan login kembali
4. Check browser console untuk error

Jika ada error saat save template:
1. Pastikan semua field terisi
2. Check koneksi ke Supabase
3. Verify RLS policies sudah aktif
