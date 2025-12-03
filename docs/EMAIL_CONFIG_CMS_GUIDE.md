# 📧 Email Configuration CMS - Setup Guide

## Overview

Sistem email sekarang menggunakan **Email Configuration CMS** yang memungkinkan Anda mengatur provider email langsung dari website tanpa perlu edit backend/environment variables.

## ✨ Fitur

✅ **Multiple Email Providers**: SMTP, SendGrid, Mailgun  
✅ **Web-Based Configuration**: Atur semua setting dari admin dashboard  
✅ **Test Email Function**: Test konfigurasi langsung dari UI  
✅ **Database-Driven**: Config tersimpan di Supabase database  
✅ **No Backend Edit**: Tidak perlu edit code atau environment variables  

---

## 🚀 Setup Step-by-Step

### Step 1: Jalankan Database Migration

1. Buka **PowerShell** atau **Terminal**
2. Masuk ke folder project:
   ```powershell
   cd D:\Github\Eventregistrationwebsite
   ```

3. Jalankan migration:
   ```powershell
   npx supabase db push
   ```
   
   Atau jika pakai Supabase Dashboard:
   - Login ke https://supabase.com
   - Pilih project Anda
   - Klik **SQL Editor** di sidebar
   - Copy paste isi file `supabase/migrations/009_create_email_config.sql`
   - Klik **Run**

### Step 2: Deploy Edge Function yang Sudah Diupdate

```powershell
# Deploy function
npx supabase functions deploy send-email
```

### Step 3: Akses Email Configuration di Website

1. Login ke admin dashboard
2. Pilih event Anda
3. Klik tab **"Email Settings"** (icon ⚙️ di menu atas)
4. Anda akan melihat form konfigurasi email

---

## 📝 Cara Menggunakan Email Configuration

### General Settings

1. **Sender Name**: Nama pengirim yang akan muncul di email
   - Contoh: `Event Registration System`, `Acara XYZ`

2. **Sender Email**: Alamat email pengirim
   - Contoh: `noreply@yourdomain.com`

3. **Email Service Active**: Toggle untuk aktifkan/nonaktifkan email service

### Provider Settings

Pilih salah satu provider di tab:

#### Option 1: SMTP (Recommended untuk Pemula)

**Kapan pakai SMTP?**
- Punya email hosting sendiri (cPanel/Plesk)
- Mau pakai Gmail gratis (500 email/hari)
- Butuh kontrol penuh

**Form yang harus diisi:**
- **SMTP Host**: Server SMTP Anda
  - Gmail: `smtp.gmail.com`
  - cPanel: `mail.yourdomain.com`
  - Outlook: `smtp-mail.outlook.com`
  
- **SMTP Port**: 
  - `587` (TLS - recommended)
  - `465` (SSL)
  
- **SMTP Username**: Email address lengkap
  - Contoh: `noreply@yourdomain.com`
  
- **SMTP Password**: Password email Anda
  - Untuk Gmail: gunakan **App Password** (bukan password biasa)

**Setup Gmail App Password:**
1. Buka https://myaccount.google.com/apppasswords
2. Aktifkan 2-Step Verification dulu jika belum
3. Generate App Password untuk "Mail"
4. Copy password 16 karakter
5. Paste ke form SMTP Password

#### Option 2: SendGrid

**Kapan pakai SendGrid?**
- Butuh kirim email dalam volume besar
- Mau tracking email (open rate, click rate)
- Butuh deliverability tinggi

**Form yang harus diisi:**
- **SendGrid API Key**: API key dari SendGrid
  - Daftar di https://sendgrid.com
  - Free tier: 100 email/hari
  - Buka Settings → API Keys
  - Create API Key dengan Full Access
  - Copy paste ke form

#### Option 3: Mailgun

**Kapan pakai Mailgun?**
- Alternatif SendGrid
- Gratis 5,000 email/bulan (3 bulan pertama)

**Form yang harus diisi:**
- **Mailgun Domain**: Domain yang sudah diverifikasi di Mailgun
  - Contoh: `mg.yourdomain.com`
  
- **Mailgun API Key**: API key dari Mailgun
  - Daftar di https://www.mailgun.com
  - Verify domain Anda
  - Copy API Key dari dashboard

---

## 🧪 Test Email Configuration

Setelah mengisi form:

1. Klik **"Save Configuration"** di kanan atas
2. Tunggu notifikasi sukses
3. Scroll ke bawah ke section **"Test Email Configuration"**
4. Masukkan email Anda di form test
5. Klik **"Send Test Email"**
6. Cek inbox email Anda

Jika berhasil, Anda akan terima email test dengan subject:
**"Test Email from Event Registration System"**

---

## 🔧 Troubleshooting

### Error: "Email configuration not found"

**Solusi**: Migration belum jalan. Jalankan Step 1 lagi.

### Error: "SMTP configuration incomplete"

**Solusi**: 
- Pastikan SMTP Host, Username, Password sudah diisi
- Cek tidak ada typo
- Untuk Gmail, pastikan pakai App Password

### Error: "SendGrid API key not configured"

**Solusi**: Tab SendGrid dipilih tapi API key kosong. Isi API key atau ganti ke provider lain.

### Error: "Authentication failed" (SMTP)

**Solusi**:
1. Cek username = full email address (bukan cuma nama)
2. Cek password benar
3. Untuk Gmail: HARUS pakai App Password (bukan password Google biasa)
4. Coba ganti port dari 587 ke 465 atau sebaliknya

### Test Email Gagal Terkirim

**Checklist**:
- [ ] Configuration sudah di-save
- [ ] Email Service Active (toggle hijau)
- [ ] Semua field wajib sudah diisi
- [ ] Test dengan email yang valid
- [ ] Cek spam folder

### Email Masuk Spam

**Solusi**:
1. Pastikan Sender Email = SMTP Username (untuk SMTP)
2. Setup SPF record di DNS domain Anda
3. Untuk SendGrid/Mailgun: mereka sudah handle ini
4. Test kirim ke email sendiri, mark as "Not Spam"

---

## 📊 Provider Comparison

| Provider | Free Tier | Best For | Setup Difficulty |
|----------|-----------|----------|------------------|
| **SMTP (Gmail)** | 500/day | Small events, testing | ⭐ Easy |
| **SMTP (Own)** | Unlimited* | Custom domain, privacy | ⭐⭐ Medium |
| **SendGrid** | 100/day | Tracking, reliability | ⭐ Easy |
| **Mailgun** | 5,000/month | High volume | ⭐⭐ Medium |

*Tergantung hosting plan Anda

---

## 🎯 Recommended Setup

### Untuk Event Kecil (<100 peserta)
→ **SMTP dengan Gmail**
- Gratis
- Setup 5 menit
- Reliable

### Untuk Event Sedang (100-1000 peserta)
→ **SendGrid atau Mailgun**
- Free tier cukup
- Tracking & analytics
- Professional

### Untuk Event Besar (>1000 peserta)
→ **SendGrid atau Mailgun (Paid Plan)**
- Dedicated IP
- High deliverability
- Support

---

## 💡 Tips & Best Practices

1. **Always Test First**: Selalu test sebelum kirim ke participants
2. **Use App Password**: Jangan pakai password utama untuk Gmail
3. **Monitor Limits**: Cek quota harian/bulanan provider Anda
4. **Backup Config**: Screenshot konfigurasi Anda
5. **Check Spam Folder**: Saat test, selalu cek spam juga

---

## 🔐 Security Notes

- Password/API key di-encrypt di database Supabase
- Hanya admin yang bisa lihat/edit konfigurasi
- Edge Function menggunakan Service Role Key (secure)
- TIDAK perlu store credentials di environment variables

---

## 📞 Support

Jika masih ada masalah:

1. **Check Logs**: 
   - Supabase Dashboard → Edge Functions → Logs
   - Lihat error message detail

2. **Verify Settings**:
   - Double check semua field
   - Test dengan curl/Postman

3. **Try Different Provider**:
   - Jika SMTP tidak work, coba SendGrid
   - Jika satu port tidak work, coba port lain

---

## ✅ Quick Checklist

Sebelum production:

- [ ] Database migration sudah jalan
- [ ] Edge function sudah di-deploy
- [ ] Email configuration sudah diisi
- [ ] Test email berhasil terkirim
- [ ] Email tidak masuk spam
- [ ] Provider sesuai volume peserta
- [ ] Backup konfigurasi

Selamat! Email configuration CMS Anda sudah siap digunakan! 🎉
