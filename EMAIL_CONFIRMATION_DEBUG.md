# Email Confirmation Debugging Guide

## Masalah yang Diperbaiki

Custom questions tidak tersimpan dan email konfirmasi tidak terkirim setelah registrasi.

## Perbaikan yang Dilakukan

### 1. Fix Custom Data Storage (✅ SELESAI)
**Masalah:** Form registrasi langsung insert ke database tanpa melalui fungsi `createParticipant()`
**Solusi:** Menggunakan fungsi `createParticipant()` dari `supabaseDataLayer.ts` yang sudah handle proper field mapping

**File diubah:**
- `src/components/PublicRegistrationForm.tsx` - Import dan gunakan `createParticipant()`

### 2. Fix Email Confirmation Settings (✅ SELESAI)
**Masalah:** Interface `BrandingSettings` di `supabaseDataLayer.ts` tidak memiliki field email
**Solusi:** Tambahkan `autoSendConfirmation` dan `confirmationTemplateId` ke interface

**File diubah:**
- `src/utils/supabaseDataLayer.ts` - Update interface BrandingSettings

### 3. Enhanced Debugging Logs (✅ SELESAI)
Menambahkan console.log untuk tracking:
- Kapan email settings di-load
- Apakah auto-send enabled
- Template ID apa yang digunakan
- Status pengiriman email

**File diubah:**
- `src/components/PublicRegistrationForm.tsx` - Tambah logging di loadEventData dan handleSubmit
- `src/components/BrandingSettingsNew.tsx` - Tambah logging di handleSave

## Cara Testing

### 1. Pastikan Settings Tersimpan
1. Buka admin dashboard → Event → Branding Settings
2. Scroll ke bagian "Email Confirmation"
3. Aktifkan toggle "Auto Send Confirmation"
4. Pilih template email dari dropdown
5. Klik "Save All Settings"
6. Buka browser console (F12) - harus muncul log:
   ```
   [BrandingSettings] Saving settings: {
     autoSendConfirmation: true,
     confirmationTemplateId: "tmp-xxx-xxx",
     ...
   }
   [BrandingSettings] ✅ Settings saved successfully
   ```

### 2. Test Registration Form
1. Buka registration link (dari admin dashboard)
2. Buka browser console (F12)
3. Isi form termasuk custom questions
4. Submit form
5. Periksa console logs:
   ```
   [REGISTRATION] Loaded event: Event Name
   [REGISTRATION] Email auto-send enabled? true
   [REGISTRATION] Template ID: tmp-xxx-xxx
   
   [REGISTRATION] Participant registered: prt-xxx-xxx
   [REGISTRATION] Email settings check: {
     autoSendEnabled: true,
     templateId: "tmp-xxx-xxx",
     hasTemplate: true
   }
   [REGISTRATION] Attempting to send confirmation email to: user@email.com
   [REGISTRATION] ✅ Confirmation email sent successfully to: user@email.com
   ```

### 3. Jika Email Tidak Terkirim

Periksa console untuk error messages:

**Scenario A: Settings tidak terbaca**
```
[REGISTRATION] Email auto-send enabled? undefined
[REGISTRATION] Template ID: undefined
[REGISTRATION] ⚠️ Email not sent - auto-send disabled or template not configured
```
**Solusi:** Pastikan settings sudah disimpan (cek step 1)

**Scenario B: Edge function error**
```
[REGISTRATION] Email send error: { ... }
```
**Solusi:** Periksa:
- Supabase edge function `send-email` sudah di-deploy
- Email configuration di database sudah di-setup (SendGrid API key, etc)
- Template email dengan ID tersebut ada di database

**Scenario C: Template tidak dipilih**
```
[REGISTRATION] Email settings check: {
  autoSendEnabled: true,
  templateId: "",
  hasTemplate: false
}
```
**Solusi:** Pilih template di branding settings dan save

## Verifikasi di Database

Jalankan query di Supabase SQL Editor:

```sql
-- Check event branding settings
SELECT 
  id, 
  name,
  branding->'autoSendConfirmation' as auto_send,
  branding->'confirmationTemplateId' as template_id
FROM events 
WHERE id = 'YOUR_EVENT_ID';

-- Check if participant data saved correctly
SELECT 
  id,
  name,
  email,
  "customData"
FROM participants
WHERE "eventId" = 'YOUR_EVENT_ID'
ORDER BY "registeredAt" DESC
LIMIT 5;

-- Check email templates
SELECT id, name, subject
FROM email_templates
WHERE event_id = 'YOUR_EVENT_ID';
```

## Troubleshooting Checklist

- [ ] Interface `BrandingSettings` sudah include `autoSendConfirmation` dan `confirmationTemplateId`
- [ ] Settings di-save dengan benar (cek console log saat save)
- [ ] Registration form me-load branding settings dengan benar (cek console log saat load)
- [ ] Toggle "Auto Send Confirmation" aktif di branding settings
- [ ] Template email sudah dipilih dari dropdown
- [ ] Edge function `send-email` sudah di-deploy
- [ ] Email configuration (SendGrid) sudah di-setup di database
- [ ] Template email dengan ID yang dipilih ada di database `email_templates`

## Next Steps

Jika masih bermasalah setelah mengikuti guide ini:
1. Share console logs lengkap (dari load sampai submit)
2. Share hasil query SQL di atas
3. Check Supabase edge function logs untuk error details
