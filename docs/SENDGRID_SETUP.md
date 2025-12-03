# 🚀 SendGrid Email Setup Guide

## ✅ Yang Sudah Selesai

1. ✅ Edge Function `send-email` sudah dibuat di `supabase/functions/send-email/`
2. ✅ CORS helper sudah dibuat
3. ✅ ParticipantManagement.tsx sudah update (individual send)
4. ✅ EmailTemplates.tsx sudah update (test email + mass blast)

---

## 📋 Langkah Setup (WAJIB!)

### Step 1: Dapatkan SendGrid API Key

1. Login ke https://sendgrid.com
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name: `Event Registration System`
5. Permissions: **Full Access** (atau minimal **Mail Send**)
6. Click **Create & View**
7. **COPY API KEY** (hanya muncul sekali!)

---

### Step 2: Verify Sender Email di SendGrid

**PENTING:** SendGrid tidak akan mengirim email jika sender belum diverifikasi!

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Isi form:
   - From Name: `Event Registration System`
   - From Email Address: Email Anda (contoh: `noreply@yourdomain.com`)
   - Reply To: Email support Anda
   - Company Address: Alamat perusahaan
4. Click **Create**
5. Cek inbox email Anda
6. Click link verifikasi dari SendGrid
7. ✅ Sender terverifikasi!

**ATAU** verify domain Anda (lebih profesional):
- Go to **Settings** → **Sender Authentication** → **Authenticate Your Domain**
- Follow DNS setup instructions
- Tunggu verifikasi (bisa 24-48 jam)

---

### Step 3: Deploy Edge Function ke Supabase

Anda punya 2 opsi:

#### Opsi A: Via Supabase Dashboard (Recommended - Mudah!)

1. Buka https://supabase.com/dashboard
2. Pilih project Anda
3. Go to **Edge Functions** (di sidebar kiri)
4. Click **Deploy new function**
5. Function name: `send-email`
6. Copy-paste isi file `supabase/functions/send-email/index.ts` ke editor
7. Click **Deploy function**

#### Opsi B: Via Supabase CLI (Advanced)

```powershell
# 1. Install Supabase CLI (jika belum)
npm install -g supabase

# 2. Login ke Supabase
supabase login

# 3. Link project (ganti YOUR_PROJECT_REF dengan ref Anda)
# Ref ada di Settings → General → Reference ID
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy function
supabase functions deploy send-email

# 5. Verify deployment
supabase functions list
```

---

### Step 4: Set Environment Variables di Supabase

**CRITICAL STEP!** Function tidak akan jalan tanpa ini.

1. Go to Supabase Dashboard → **Project Settings** → **Edge Functions**
2. Scroll ke **Secrets** section
3. Add secret #1:
   - Name: `SENDGRID_API_KEY`
   - Value: Paste API Key dari Step 1
   - Click **Add**

4. Add secret #2:
   - Name: `SENDER_EMAIL`
   - Value: Email yang sudah diverifikasi di Step 2 (contoh: `noreply@yourdomain.com`)
   - Click **Add**

5. (Optional) Add secret #3:
   - Name: `SENDER_NAME`
   - Value: `Event Registration System` (atau nama lain)
   - Click **Add**

**Via CLI (alternative):**
```powershell
supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set SENDER_EMAIL=noreply@yourdomain.com
supabase secrets set SENDER_NAME="Event Registration System"
```

---

### Step 5: Test Edge Function

#### Test via Supabase Dashboard:

1. Go to **Edge Functions** → **send-email**
2. Click **Invoke function**
3. Request body:
```json
{
  "to": "YOUR_EMAIL@gmail.com",
  "subject": "Test Email",
  "html": "<h1>Hello!</h1><p>This is a test email from your event system.</p>",
  "participantId": "TEST123"
}
```
4. Click **Run**
5. Check response (should be `success: true`)
6. Check your inbox!

#### Test via CLI:

```powershell
supabase functions invoke send-email --data '{\"to\":\"YOUR_EMAIL@gmail.com\",\"subject\":\"Test\",\"html\":\"<h1>Hello</h1>\"}'
```

---

### Step 6: Test di Aplikasi

#### Test 1: Individual Send

1. Go to **Admin Dashboard** → **Participants** tab
2. Click **Mail icon** (📧) di participant dengan email Anda
3. Pilih template
4. Click **Send Email**
5. Wait for success message
6. Check inbox!

#### Test 2: Test Email

1. Go to **Email Templates** tab
2. Click **Send Test Email** di template
3. Enter your email
4. Click **Send Test**
5. Check inbox!

#### Test 3: Mass Blast

1. Pastikan ada beberapa participants (gunakan email Anda sendiri untuk test)
2. Go to **Email Templates**
3. Click **Send to All Participants**
4. Review & confirm
5. Watch progress bar
6. Check inbox untuk setiap email!

---

## 🔍 Troubleshooting

### Error: "SENDGRID_API_KEY not configured"
- ✅ Set secret di Supabase Dashboard (Step 4)
- ✅ Redeploy function setelah set secret

### Error: "403 Forbidden" dari SendGrid
- ✅ Verify sender email di SendGrid (Step 2)
- ✅ Check API Key masih valid
- ✅ Pastikan API Key punya Mail Send permission

### Error: "Invalid email format"
- ✅ Check participant email di database
- ✅ Pastikan format email valid (ada @ dan domain)

### Emails masuk Spam
- ✅ Verify domain (bukan hanya single sender)
- ✅ Setup SPF, DKIM di DNS
- ✅ Gunakan professional email (bukan Gmail/Yahoo)

### Rate Limiting Error
- ✅ SendGrid Free: max 100 emails/day
- ✅ Upgrade plan jika butuh lebih banyak
- ✅ Code sudah include delay 100ms per email

---

## 📊 Monitoring

### Check Edge Function Logs:

```powershell
# Via CLI
supabase functions logs send-email

# Atau via Dashboard:
# Edge Functions → send-email → Logs tab
```

### Check SendGrid Activity:

1. SendGrid Dashboard → **Activity**
2. Filter by date
3. Lihat:
   - Processed: Email sent dari server
   - Delivered: Email sampai inbox
   - Bounced: Email gagal (invalid address)
   - Dropped: Email dropped oleh SendGrid

---

## 💰 SendGrid Pricing

- **Free**: 100 emails/day forever
- **Essentials**: $19.95/month - 50,000 emails
- **Pro**: $89.95/month - 100,000 emails

Untuk event dengan >100 participants, pertimbangkan upgrade atau gunakan multiple days.

---

## ✅ Checklist Setup

- [ ] SendGrid account created
- [ ] SendGrid API Key copied
- [ ] Sender email verified di SendGrid
- [ ] Edge function deployed to Supabase
- [ ] SENDGRID_API_KEY secret set
- [ ] SENDER_EMAIL secret set
- [ ] Test function via dashboard (success!)
- [ ] Test individual send via UI (email received!)
- [ ] Test email received di inbox
- [ ] Ready untuk production blast! 🚀

---

## 🎯 Next Steps After Setup

1. **Run database migration** `007_add_email_tracking.sql` (jika belum)
2. **Create email templates** di Email Templates tab
3. **Test with yourself** sebagai participant
4. **Monitor email status** di Participants tab (email status badges)
5. **Check Email Center** untuk analytics

---

## 🆘 Need Help?

1. Check Edge Function logs di Supabase
2. Check SendGrid Activity logs
3. Check browser console (F12)
4. Verify all secrets are set correctly
5. Test with curl/Postman first before UI

Good luck! 🎉
