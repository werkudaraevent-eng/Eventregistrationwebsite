# 🚨 FIX Upload Error - Storage Bucket

## Error yang Muncul:
```
POST .../storage/v1/object/email-attachments/... 400 (Bad Request)
Error uploading file: new row violates row-level security policy
```

## ✅ Solusi Cepat (2 Menit)

### CARA 1: Via Storage UI (PALING MUDAH) ⭐

1. **Buka Supabase Dashboard**: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne/storage/buckets
2. **Klik "Create a new bucket"** (tombol hijau)
3. **Isi form**:
   - **Name**: `email-attachments`
   - **Public bucket**: ✅ **CENTANG INI!**
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: Kosongkan saja (allow all)
4. **Klik "Create bucket"**
5. **Klik bucket yang baru dibuat** → **Policies tab**
6. **Klik "New Policy"** → **"For full customization"**
7. **Paste policy ini**:

```sql
-- Policy name: Allow authenticated uploads and deletes
((bucket_id = 'email-attachments'::text))
```

8. **Target roles**: `authenticated`
9. **Klik "Review"** → **"Save policy"**

### CARA 2: Via SQL Editor (Alternatif)

⚠️ **HANYA jika Cara 1 tidak berhasil**

1. **Buka SQL Editor**: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne/sql/new

1. **Buka SQL Editor**: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne/sql/new
2. **Paste SQL ini**:

```sql
-- ONLY create bucket, no ALTER table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments', 
  'email-attachments', 
  true,
  5242880,
  NULL
)
ON CONFLICT (id) DO UPDATE 
SET public = true, file_size_limit = 5242880;
```

3. **Klik "Run"**
4. **Refresh aplikasi** dan coba upload lagi

---

### Step 3: Test Upload
1. **Kembali ke aplikasi** (localhost:3000)
2. **Refresh browser** (F5)
3. **Coba upload file lagi** → Seharusnya berhasil! ✅

---

## Penjelasan

**Kenapa error ini muncul?**
- Storage bucket `email-attachments` belum dibuat
- Row Level Security (RLS) policy menghalangi upload

**Apa yang dilakukan?**
1. **Create bucket** bernama `email-attachments` dengan public access
2. **Set file size limit** 5MB
3. **Public = true** agar file bisa diakses via URL

**Kenapa tidak pakai ALTER TABLE?**
- User biasa tidak punya permission untuk ALTER `storage.objects`
- Hanya superuser/owner yang bisa
- Bucket policies akan otomatis di-handle oleh Supabase saat create bucket via UI

**Apakah aman?**
- Untuk internal admin app: **Aman** (hanya admin yang login bisa upload)
- Untuk production dengan public access: Sebaiknya gunakan policy yang lebih ketat

---

## Alternative: Pakai Policy via SQL (Advanced)

⚠️ **Hanya gunakan jika Anda sudah create bucket via UI dan masih error**

Jika bucket sudah ada tapi masih error upload:

⚠️ **Hanya gunakan jika Anda sudah create bucket via UI dan masih error**

Jika bucket sudah ada tapi masih error upload:

```sql
-- Add policy untuk authenticated users (upload & delete)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'email-attachments');

-- Public read access
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'email-attachments');
```

**ATAU** via **Supabase Dashboard**:
1. **Storage** → **email-attachments** → **Policies**
2. **Disable RLS** toggle (paling mudah untuk dev environment)

---

## Verify Bucket Exists

Jalankan query ini untuk check apakah bucket sudah dibuat:

```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'email-attachments';
```

Hasil yang benar:
```
id                 | name              | public
-------------------+-------------------+--------
email-attachments  | email-attachments | true
```

---

## Troubleshooting

### Masih error setelah run SQL?
1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Logout & Login** di aplikasi
3. **Restart dev server**: Stop (Ctrl+C) lalu `npm run dev`

### Error "Bucket already exists"?
✅ Bagus! Bucket sudah ada. Coba upload lagi.

### Error "permission denied" atau "must be owner of table"?
**Solusi**: 
1. **Jangan pakai SQL** untuk ALTER table objects
2. **Gunakan Storage UI** untuk create bucket (Cara 1 di atas)
3. **Disable RLS** via toggle di Storage > Policies (bukan via SQL)

---

**Quick Link SQL Editor**: https://supabase.com/dashboard/project/xtrognfmzyzqhsfvtgne/sql/new
