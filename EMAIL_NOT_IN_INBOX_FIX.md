# ✅ Email Test 200 OK Tapi Tidak Masuk Inbox - Troubleshooting

## Status: 200 OK = Email Terkirim dari Server ✅

Kalau Anda dapat response **200 OK**, berarti:
- ✅ Konfigurasi sudah benar
- ✅ SMTP connection berhasil
- ✅ Email berhasil dikirim dari server

Tapi kenapa tidak masuk inbox?

---

## 🔍 Checklist Troubleshooting

### 1. ✉️ Cek Folder SPAM/JUNK ⚠️ (PALING SERING!)

Email pertama kali dari SMTP baru hampir SELALU masuk spam.

**Cara cek:**
1. Buka email Anda (`hanungsastria13@gmail.com`)
2. Klik folder **"Spam"** atau **"Junk"**
3. Cari email dengan subject: **"Test Email from Event Registration System"**
4. Kalau ada → Klik **"Not Spam"** / **"Bukan Spam"**
5. Pindahkan ke Inbox

---

### 2. 📧 Cek Email Settings Anda

**SMTP Host:** `utamakalpana.com` → Ini bukan SMTP host yang valid!

❌ **SALAH:**
```
SMTP Host: utamakalpana.com
```

✅ **BENAR (untuk cPanel hosting):**
```
SMTP Host: mail.utamakalpana.com
```

**Atau untuk Gmail:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: hanungsastria13@gmail.com
SMTP Password: [App Password 16 karakter]
```

---

### 3. 🔐 SMTP Password untuk Gmail

Kalau Anda pakai email `event@utamakalpana.com` tapi password-nya salah, email akan gagal authenticate.

**Untuk email hosting sendiri (cPanel):**
- Username: `event@utamakalpana.com` (full email)
- Password: Password email dari cPanel
- Host: `mail.utamakalpana.com`
- Port: `465` (SSL) atau `587` (TLS)

**Untuk Gmail:**
- Username: `hanungsastria13@gmail.com`
- Password: **App Password** (BUKAN password Gmail)
- Host: `smtp.gmail.com`
- Port: `587`

---

### 4. 📊 Cek Logs di Supabase

1. Buka **Supabase Dashboard**
2. Klik **Edge Functions** → **send-email**
3. Klik **Logs**
4. Cari log dengan waktu yang sama dengan test Anda
5. Lihat apakah ada error message

---

### 5. 🧪 Test Ulang dengan Gmail SMTP

Kalau email dari `utamakalpana.com` tidak masuk, coba test dengan Gmail:

1. Di **Email Settings** → **Provider Settings (SMTP)**
2. Ubah ke:
   - **SMTP Host:** `smtp.gmail.com`
   - **SMTP Port:** `587`
   - **SMTP Username:** `hanungsastria13@gmail.com`
   - **SMTP Password:** [App Password dari Google]
3. **Save Provider Settings**
4. Test kirim ke email lain (bukan Gmail yang sama)

---

## 🔑 Cara Buat Gmail App Password

1. Buka: https://myaccount.google.com/apppasswords
2. Login dengan `hanungsastria13@gmail.com`
3. **Select app:** Mail
4. **Select device:** Other (Custom name) → Ketik: `Event System`
5. Klik **Generate**
6. Copy **16 karakter password** (contoh: `abcd efgh ijkl mnop`)
7. Paste ke **SMTP Password** (tanpa spasi: `abcdefghijklmnop`)
8. Save

---

## 🎯 Rekomendasi Fix

### Option 1: Perbaiki SMTP Host cPanel

```
SMTP Host: mail.utamakalpana.com  (TAMBAHKAN "mail.")
SMTP Port: 465
SMTP Username: event@utamakalpana.com
SMTP Password: [password cPanel email]
```

### Option 2: Pakai Gmail (Lebih Mudah)

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: hanungsastria13@gmail.com
SMTP Password: [App Password 16 karakter]
Sender Email: hanungsastria13@gmail.com (sama dengan username)
```

---

## 📝 Langkah Testing yang Benar

1. **Update SMTP settings** dengan salah satu option di atas
2. **Klik "🔧 Save Provider Settings"**
3. **Tunggu notifikasi "Save successful"**
4. **Test kirim ke email LAIN** (jangan ke email yang sama dengan pengirim)
5. **Cek Spam folder** di email penerima
6. **Kalau ada di spam** → Mark as "Not Spam"
7. **Test lagi** → Email berikutnya akan masuk inbox

---

## ✅ Indikator Email Berhasil

- ✅ Response 200 OK di Network tab
- ✅ Tidak ada error di Console
- ✅ Email masuk ke **Spam** folder (pertama kali normal)
- ✅ Setelah mark "Not Spam", email berikutnya masuk Inbox

---

## 🚨 Kalau Tetap Tidak Masuk (Bahkan Spam)

1. **Cek Supabase Logs** - mungkin ada error yang tidak terlihat di browser
2. **Coba kirim ke email provider lain** - Kalau test ke Gmail, coba kirim ke Yahoo/Outlook
3. **Tunggu 5-10 menit** - Kadang email delay
4. **Cek email settings** di cPanel - pastikan email `event@utamakalpana.com` aktif dan bisa diakses

---

## 💡 Tips Pro

1. **Gunakan Gmail SMTP** untuk testing awal (paling reliable)
2. **Setelah berhasil**, baru switch ke email domain sendiri
3. **Email pertama PASTI masuk spam** - ini normal
4. **Mark as Not Spam** beberapa kali untuk train email filter
5. **Setup SPF/DKIM** di DNS untuk menghindari spam (advanced)

---

Coba cek **Spam folder** dulu, kemungkinan besar email ada di sana! 📧
