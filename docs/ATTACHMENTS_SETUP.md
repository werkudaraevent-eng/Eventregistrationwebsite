# 📎 Email Attachments Setup Guide

## ⚠️ QUICK FIX - Error "row-level security policy"

Jika Anda mendapat error **"new row violates row-level security policy"**, jalankan SQL ini di **Supabase SQL Editor**:

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Disable RLS (paling mudah)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**Setelah run SQL di atas, refresh browser dan coba upload lagi!** ✅

---

## Overview
Fitur attachments memungkinkan Anda menambahkan file ke email template (PDF, DOC, XLS, Images) yang akan dikirim bersama email.

---

## 🚀 Setup (2 Langkah)

### Step 1: Update Database Schema

1. **Buka Supabase Dashboard**: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne
2. **Go to SQL Editor** (sidebar kiri)
3. **Klik "New query"**
4. **Paste SQL ini**:

```sql
-- Add attachments column to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS attachments TEXT[];

-- Add comment
COMMENT ON COLUMN email_templates.attachments IS 'Array of attachment file URLs from Supabase Storage';
```

5. **Klik "Run"** (Ctrl+Enter)
6. **Verify**: Kamu harus lihat "Success. No rows returned"

---

### Step 2: Create Storage Bucket

1. Masih di **Supabase Dashboard**
2. **Klik "Storage"** di sidebar kiri
3. **Klik "Create a new bucket"**
4. **Isi form**:
   - **Name**: `email-attachments`
   - **Public bucket**: ✅ **CENTANG INI** (penting agar file bisa diakses via URL)
   - **File size limit**: 5 MB (atau sesuai kebutuhan)
   - **Allowed MIME types**: Leave empty (allow all) atau isi:
     ```
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.ms-excel
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     image/jpeg
     image/png
     ```
5. **Klik "Create bucket"**

---

### Step 3: Set Bucket Policies (Optional - Security)

Jika ingin mengatur akses lebih ketat:

1. Di **Storage** > **Policies** tab untuk bucket `email-attachments`
2. **Add Policy** dengan aturan:

**Policy untuk Upload (Insert):**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-attachments');
```

**Policy untuk Public Read:**
```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'email-attachments');
```

**Policy untuk Delete (admin only):**
```sql
-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'email-attachments');
```

---

## 🎯 Cara Menggunakan

### 1. Create Email Template dengan Attachment

1. Go to **Admin Dashboard** > **Email Templates** tab
2. Klik **"Create Template"**
3. Isi **Template Name**, **Subject**, **Body**
4. Di bagian **"Attachments (Optional)"**:
   - Klik **"Upload File"**
   - Pilih file (max 5MB)
   - Tunggu upload selesai
   - File akan muncul di list
5. Klik **"Create"**

### 2. Edit Template - Tambah/Hapus Attachment

1. Klik **"Edit"** pada template yang ada
2. Di bagian **Attachments**:
   - **Tambah**: Klik "Upload File" lagi
   - **Hapus**: Klik tombol **X** di samping nama file
3. Klik **"Save Changes"**

### 3. Duplicate Template (Copy Attachments)

Saat duplicate template, attachments ikut ter-copy!

---

## 📋 File Types yang Didukung

- **PDF**: `.pdf`
- **Word**: `.doc`, `.docx`
- **Excel**: `.xls`, `.xlsx`
- **Images**: `.jpg`, `.jpeg`, `.png`

**Max file size**: 5MB per file

---

## 🔍 Troubleshooting

### Error: "Failed to upload file: Bucket not found"
**Solusi**: Belum create storage bucket. Ikuti **Step 2** di atas.

### Error: "File size must be less than 5MB"
**Solusi**: Compress file atau gunakan file yang lebih kecil.

### File upload tapi tidak muncul di list
**Solusi**: 
1. Check browser console untuk error
2. Pastikan bucket `email-attachments` sudah **public**
3. Refresh page

### Attachment tidak bisa diakses (404)
**Solusi**:
1. Pastikan bucket setting di Storage adalah **Public**
2. Check policy: Public read harus enabled

---

## 🔐 Security Notes

1. **Public Bucket**: Files bisa diakses siapa saja yang punya URL
2. **No Authentication**: Upload hanya bisa dari authenticated admin users
3. **File Naming**: File di-rename otomatis dengan timestamp untuk avoid conflicts
4. **Cleanup**: File tidak auto-delete saat hapus template (manual cleanup via Storage dashboard)

---

## 📊 Storage Management

### View Uploaded Files
1. **Storage** > **email-attachments** bucket
2. Browse folders by event ID
3. See file size, upload date, etc

### Delete Old Files
1. Go to Storage dashboard
2. Select files
3. Click Delete

### Check Storage Usage
**Storage** > View total storage used vs quota

---

## ✅ Verification Checklist

Setelah setup, test dengan:

- [ ] Create template dengan 1 attachment
- [ ] Upload file PDF
- [ ] Upload file image
- [ ] Edit template - tambah attachment lagi
- [ ] Edit template - hapus attachment
- [ ] Duplicate template (verify attachments copied)
- [ ] Check Storage dashboard - files ada
- [ ] Click attachment filename - file bisa di-download

---

## 🎉 Ready!

Setelah setup selesai, **refresh browser** dan coba upload attachment ke email template!

**Storage Bucket URL**: 
`https://xtrognfmzyzqhsfvtgne.supabase.co/storage/v1/object/public/email-attachments/`
