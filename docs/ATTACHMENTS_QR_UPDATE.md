# ✅ Email Template Attachments - Update Complete!

## 🎉 Fitur Baru yang Ditambahkan:

### 1️⃣ **Attachment Indicator di Template List**
- ✅ Badge menampilkan jumlah attachments (misal: "2 Attachments")
- ✅ List 2 file pertama di preview
- ✅ "+X more" jika ada lebih dari 2 files
- ✅ Warna biru untuk attachment indicator

### 2️⃣ **QR Code Option untuk Peserta**
- ✅ Checkbox "Include Participant QR Code"
- ✅ Setiap peserta akan dapat QR code unik mereka sebagai attachment
- ✅ QR code indicator di template card (warna ungu)
- ✅ Emoji 📱 sebagai visual cue

---

## 📊 Database Migration Required

Jalankan SQL ini di **Supabase SQL Editor**:

```sql
-- Add include_qr_code column
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS include_qr_code BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN email_templates.include_qr_code IS 'Whether to include participant QR code as attachment when sending email';

-- Set default for existing records
UPDATE email_templates SET include_qr_code = false WHERE include_qr_code IS NULL;
```

---

## 🎨 Tampilan Baru

### Template Card dengan Attachments:
```
┌─────────────────────────────────────┐
│ Confirm Your Attendance             │
│ [Registration Confirmation]         │
├─────────────────────────────────────┤
│ Subject: Confirm Your Attendance... │
│                                     │
│ Body Preview:                       │
│ Dear Mr./Ms. Dian Prasetyo...      │
│                                     │
│ ┌─ 📎 2 Attachments ──────────────┐│
│ │ • presentation.pdf              ││
│ │ • form.docx                     ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─ 📱 QR Code Enabled ───────────┐│
│ │ Participant QR codes will be   ││
│ │ attached                        ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ [Edit] [Duplicate] [Delete]         │
└─────────────────────────────────────┘
```

### Create/Edit Dialog - Attachments Section:
```
Attachments (Optional)
┌────────────────────────────────────────────┐
│ [📤 Upload File]  Max 5MB (PDF, DOC...)   │
│                                            │
│ ┌── Uploaded Files ──────────────────────┐│
│ │ 📎 presentation.pdf             [X]   ││
│ │ 📎 registration_form.docx       [X]   ││
│ └──────────────────────────────────────────┘│
│                                            │
│ ┌── QR Code Option ──────────────────────┐│
│ │ [✓] 📱 Include Participant QR Code    ││
│ │ Each participant will receive their   ││
│ │ unique QR code as an attachment       ││
│ └──────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

---

## 🔧 Technical Details

### Data Structure:
```typescript
interface EmailTemplate {
  attachments?: string[];       // Array of file URLs from Storage
  include_qr_code?: boolean;   // Whether to attach QR codes
}
```

### Storage:
- **Bucket**: `email-attachments`
- **Path**: `{eventId}/{timestamp}_{random}.{ext}`
- **Public**: Yes (untuk download via URL)

### QR Code Generation:
- QR code akan di-generate saat **sending email** (bukan saat create template)
- Setiap participant dapat QR code unique berdasarkan participant ID mereka
- Format QR: URL check-in atau participant data

---

## 🚀 Cara Menggunakan

### Upload File Attachment:
1. Create/Edit email template
2. Klik **"Upload File"**
3. Pilih file (max 5MB)
4. File muncul di list
5. Klik **X** untuk hapus file

### Enable QR Code:
1. Create/Edit email template
2. **Centang** "📱 Include Participant QR Code"
3. Save template
4. Saat send email, setiap peserta dapat QR code mereka

### View di Template List:
- **Blue badge**: File attachments (static files)
- **Purple badge**: QR code enabled (dynamic per-participant)
- Klik template untuk lihat detail

---

## 📋 Next Steps (Implementation Needed)

Untuk **mengirim email** dengan attachments + QR code, perlu tambah:

1. **Email Sending Function** yang:
   - Mengambil template
   - Generate QR code per participant
   - Attach files dari storage
   - Send via email service (SendGrid/AWS SES/etc)

2. **QR Code Generator** yang create:
   - Unique QR code per participant
   - Contains: participant_id atau check-in URL
   - Export as PNG/SVG

3. **Send Email Button** di:
   - Participant list (send individual)
   - Bulk send (send ke multiple participants)
   - Template preview (test send)

---

## ✅ Testing Checklist

- [ ] Create template dengan file attachment
- [ ] Upload PDF file
- [ ] Upload image file
- [ ] Remove attachment
- [ ] Enable QR code option
- [ ] Disable QR code option
- [ ] Template card shows attachment count
- [ ] Template card shows QR badge
- [ ] Edit template - attachments tetap ada
- [ ] Duplicate template - attachments ter-copy
- [ ] Storage bucket shows uploaded files

---

## 🎉 Ready to Use!

Setelah run database migration, **refresh browser** dan fitur sudah siap dipakai! 

Next: Implement email sending functionality untuk actually send email dengan attachments + QR code.
