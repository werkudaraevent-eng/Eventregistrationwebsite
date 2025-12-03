# Email Multi-Provider Configuration System

## 📋 Overview

Sistem ini memungkinkan Anda untuk:
1. ✅ **Menyimpan multiple email configurations** (Gmail, SMTP, SendGrid, Mailgun)
2. ✅ **Testing setiap provider** tanpa kehilangan konfigurasi lama
3. ✅ **Switch antar provider** dengan satu klik
4. ✅ **Duplicate configuration** untuk testing variants
5. ✅ **Track test status** untuk setiap configuration

## 🚀 Setup Instructions

### 1. Run Database Migration

Jalankan migration untuk upgrade schema email_config:

```bash
# Di Supabase SQL Editor, jalankan:
```

```sql
-- File: UPGRADE_EMAIL_CONFIG_MULTI_PROVIDER.sql
```

Migration ini akan:
- Ubah struktur tabel untuk support multiple entries
- Tambah kolom `config_name`, `last_tested_at`, `last_test_status`
- Buat constraint: hanya 1 config yang bisa `is_active = true`
- Buat helper functions: `set_active_email_config()`, `duplicate_email_config()`

### 2. Update Component di App

Replace `EmailConfiguration` dengan `EmailConfigurationV2` di routing:

```typescript
// Di src/App.tsx atau src/components/EmailCenter.tsx
import { EmailConfigurationV2 } from './components/EmailConfigurationV2';

// Replace:
// <EmailConfiguration />
// Dengan:
<EmailConfigurationV2 />
```

## 📖 User Guide

### Creating a New Configuration

1. Klik tombol **"New Configuration"**
2. Isi form:
   - **Configuration Name**: Nama untuk identifikasi (contoh: "Gmail Production", "SMTP Backup")
   - **Sender Name**: Nama pengirim email
   - **Sender Email**: Email pengirim
   - **Provider**: Pilih tab (Gmail/SMTP/SendGrid/Mailgun)
   - Isi kredensial sesuai provider
3. Klik **"Create"**

### Testing a Configuration

1. **Pilih config** yang ingin di-test dari list
2. Masukkan **test email address** di form test
3. Klik **"Send Test Email"**
4. System akan:
   - Temporarily activate config tersebut
   - Send test email
   - Update status (✓ Tested atau ✗ Test Failed)
   - Show timestamp test terakhir

### Activating a Configuration

Hanya 1 config yang bisa aktif untuk production:

1. Klik tombol **"Activate"** pada config yang diinginkan
2. Config lain akan otomatis di-deactivate
3. Badge **"Active"** (hijau) akan muncul pada config aktif

### Managing Configurations

**Edit**: Klik icon pensil ✏️ untuk edit config
**Duplicate**: Klik icon copy 📋 untuk duplicate (useful untuk testing variants)
**Delete**: Klik icon trash 🗑️ untuk hapus (tidak bisa delete config yang aktif)

## 🎯 Use Cases

### Use Case 1: Testing Multiple Gmail Accounts

```
1. Create: "Gmail Personal" (your-email@gmail.com)
2. Create: "Gmail Business" (business@gmail.com)
3. Test both
4. Activate yang paling reliable
```

### Use Case 2: Backup Provider

```
1. Active: "SendGrid Production" (untuk daily usage)
2. Saved: "Gmail Backup" (jika SendGrid down)
3. Switch dengan 1 klik jika needed
```

### Use Case 3: Testing New Provider

```
1. Keep: "SMTP Current" (tetap aktif)
2. Create: "Mailgun Test" (test new provider)
3. Test extensively
4. Switch jika satisfied
```

## 🔧 Technical Details

### Database Schema

```sql
email_config:
  - id (text, PK, UUID)
  - config_name (text) -- User-friendly name
  - provider (text) -- 'gmail' | 'smtp' | 'sendgrid' | 'mailgun'
  - is_active (boolean) -- Only 1 can be true (enforced by unique index)
  - last_tested_at (timestamp)
  - last_test_status ('success' | 'failed')
  - last_test_error (text)
  ... provider-specific fields ...
```

### Helper Functions

**set_active_email_config(config_id)**
```sql
-- Deactivate all, activate specified
SELECT set_active_email_config('config-uuid-here');
```

**duplicate_email_config(source_id, new_name)**
```sql
-- Clone config dengan nama baru
SELECT duplicate_email_config('source-uuid', 'New Config Name');
```

### Edge Function Integration

Edge function `send-email` otomatis read active config:

```typescript
const { data: config } = await supabaseAdmin
  .from('email_config')
  .select('*')
  .eq('is_active', true)
  .single();
```

## 🎨 UI Features

### Visual Indicators

- 🟢 **Green border + "Active" badge**: Currently active config
- ✅ **"Tested ✓" badge**: Last test succeeded
- ❌ **"Test Failed" badge**: Last test failed
- 📅 **Timestamp**: Last test time displayed

### Smart Features

1. **Auto-deactivate others**: Ketika activate 1 config, yang lain otomatis non-aktif
2. **Test tracking**: Setiap test tersimpan hasilnya
3. **Duplicate with variants**: Clone config untuk testing different settings
4. **Cannot delete active**: Protection agar tidak hapus config yang sedang digunakan

## 🔐 Security

- RLS policies untuk authenticated users only
- Edge function gunakan service_role untuk bypass RLS
- Password fields type="password" (tidak visible di UI)
- Credential tersimpan encrypted di Supabase

## 🐛 Troubleshooting

**Problem**: "Only one active config allowed" error
**Solution**: Database constraint bekerja. Deactivate config lain dulu.

**Problem**: Test email tidak terkirim
**Solution**: 
1. Check credential config
2. Lihat `last_test_error` field di database
3. Check Supabase Edge Function logs

**Problem**: Cannot see config list
**Solution**: Run migration dulu (`UPGRADE_EMAIL_CONFIG_MULTI_PROVIDER.sql`)

## 📝 Migration dari EmailConfiguration Lama

Jika sudah ada config di `email_config` dengan `id='default'`:

1. Migration otomatis convert ke `config_name = 'Default Configuration'`
2. ID di-preserve
3. Semua field existing tetap ada
4. Bisa langsung create config baru

## 🎓 Best Practices

1. **Naming Convention**: Gunakan nama deskriptif
   - ✅ "Gmail Production - werkudara@gmail.com"
   - ✅ "SMTP Backup - mail.yourdomain.com"
   - ❌ "Config 1", "Test"

2. **Testing**: Test config sebelum activate untuk production

3. **Backup**: Simpan minimal 2 configs (primary + backup)

4. **Documentation**: Catat di config_name untuk apa config digunakan

## 🔄 Workflow Example

```
Day 1: Setup
  - Create "Gmail Dev" → Test → Activate

Day 2: Production Ready
  - Create "SendGrid Prod" → Test
  - If success → Activate
  - Keep "Gmail Dev" as backup

Day 3: Issue with SendGrid
  - Quick switch to "Gmail Dev"
  - No need re-configure!

Day 4: SendGrid Fixed
  - Switch back to "SendGrid Prod"
```

## 📊 Status Indicators

| Badge | Meaning | Action |
|-------|---------|--------|
| 🟢 Active | Config sedang digunakan production | - |
| ✓ Tested | Test email sukses | Ready to activate |
| ✗ Test Failed | Test email gagal | Fix config before activate |
| No badge | Belum pernah di-test | Test dulu before activate |

---

**Created**: 2025-11-25
**Version**: 2.0
**Database Migration**: UPGRADE_EMAIL_CONFIG_MULTI_PROVIDER.sql
**Component**: EmailConfigurationV2.tsx
