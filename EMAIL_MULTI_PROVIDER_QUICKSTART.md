# 🚀 Quick Setup - Email Multi-Provider System

## Step 1: Run Database Migration (1 menit)

1. Buka **Supabase Dashboard** → SQL Editor
2. Copy-paste isi file `UPGRADE_EMAIL_CONFIG_MULTI_PROVIDER.sql`
3. Klik **Run**
4. Tunggu sampai muncul pesan: ✅ Email config table upgraded!

## Step 2: Restart Development Server (10 detik)

```bash
# Stop server (Ctrl+C)
# Start lagi
npm run dev
```

## Step 3: Test New UI (2 menit)

1. Login ke Admin Dashboard
2. Klik tab **"Email Settings"**
3. Anda akan melihat UI baru dengan:
   - ➕ Tombol "New Configuration" 
   - 📋 List saved configurations
   - 🔄 Switch active config

## Step 4: Migrate Existing Config (opsional)

Jika sudah ada config lama dengan id='default':
- ✅ Otomatis di-convert jadi "Default Configuration"
- ✅ Semua data preserved
- ✅ Tetap bisa digunakan

## Step 5: Create Your First Config

1. Klik **"New Configuration"**
2. Isi form:
   ```
   Configuration Name: Gmail Production
   Sender Name: Event Registration
   Sender Email: werkudara.event@gmail.com
   Provider: Gmail
   Gmail Address: werkudara.event@gmail.com
   Gmail App Password: [your-16-char-password]
   ```
3. Klik **"Create"**

## Step 6: Test Configuration

1. Masukkan test email: `your-email@gmail.com`
2. Klik **"Send Test Email"**
3. Check inbox
4. Badge **"✓ Tested"** akan muncul jika sukses

## Step 7: Activate Configuration

1. Klik tombol **"Activate"** pada config yang sukses di-test
2. Badge **"Active"** (hijau) akan muncul
3. Sekarang production emails akan gunakan config ini!

---

## ✅ Done! Sistem Siap Digunakan

**Keuntungan yang Anda dapat:**
- ✅ Bisa simpan multiple providers
- ✅ Switch antar config dengan 1 klik
- ✅ Test tracking untuk setiap config
- ✅ Duplicate config untuk testing variants
- ✅ Backup config jika provider utama down

---

## 🎯 Next Steps (Optional)

### Setup Backup Provider

```
1. Create config baru: "SMTP Backup"
2. Test config
3. Simpan sebagai backup (jangan activate)
4. Gunakan untuk emergency failover
```

### Testing Workflow

```
1. Create: "Gmail Test"
2. Test: Send test emails
3. If satisfied → Duplicate to "Gmail Production"
4. Activate: "Gmail Production"
5. Keep: "Gmail Test" untuk future testing
```

---

## 📖 Full Documentation

Lihat `EMAIL_MULTI_PROVIDER_GUIDE.md` untuk:
- Use cases detail
- Technical documentation
- Troubleshooting
- Best practices

---

**Setup Time**: ~5 menit total
**Benefit**: Unlimited! 🚀
