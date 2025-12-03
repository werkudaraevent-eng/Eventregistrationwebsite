# 📧 Email Blast Setup Guide

## ✅ Yang Sudah Selesai

### 1. **UI & Functionality**
- ✅ Info box placeholder dihapus
- ✅ "Send to All Participants" button di setiap template card
- ✅ Send confirmation dialog dengan preview
- ✅ Progress tracking (sent, failed, progress bar)
- ✅ Placeholder replacement logic
- ✅ Attachment support
- ✅ QR code option ready

### 2. **Current State: Simulation Mode**
Saat ini email blast berjalan dalam **simulation mode**:
- Email **TIDAK benar-benar terkirim**
- Hanya log ke browser console
- Preview email di console
- Simulasi progress tracking

---

## 🚀 Cara Menggunakan (Simulation Mode)

### 1. Buat Email Template
```
1. Admin Dashboard → Email Templates tab
2. Click "Create Template"
3. Isi:
   - Name: "Welcome Email"
   - Subject: "Welcome to {{event_name}}!"
   - Body: "Dear {{name}}, thank you for registering..."
   - Optional: Upload attachments
   - Optional: Enable QR code
4. Save
```

### 2. Send Email Blast
```
1. Click "Send to All Participants" pada template
2. Review dialog muncul:
   - Preview subject & body
   - Placeholder explanation
   - Attachment info
   - QR code status
3. Click "Send Emails"
4. Progress bar muncul
5. Console log menampilkan preview semua email
6. Alert notification saat selesai
```

### 3. Check Console Log
```
Open Browser DevTools (F12) → Console tab

Lihat:
- Email preview untuk setiap participant
- Personalized subject
- Personalized body (first 200 chars)
- Attachments list
- QR code status
- Summary: Total/Sent/Failed
```

---

## 📬 Setup Email Service (Production)

Untuk **benar-benar mengirim email**, Anda perlu:

### Opsi 1: Supabase Edge Functions + SendGrid (Recommended)

#### A. Setup SendGrid
```bash
1. Daftar di https://sendgrid.com (Free tier: 100 emails/day)
2. Verify sender email/domain
3. Create API Key:
   - Settings → API Keys → Create API Key
   - Name: "Supabase Event Registration"
   - Permissions: Full Access (atau Mail Send only)
   - Copy API Key (hanya muncul sekali!)
```

#### B. Create Supabase Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Create function
supabase functions new send-email-blast
```

#### C. Write Edge Function Code
File: `supabase/functions/send-email-blast/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

serve(async (req) => {
  try {
    const { to, subject, html, attachments, participantId } = await req.json()

    // Send via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
        }],
        from: {
          email: 'noreply@yourdomain.com',
          name: 'Event Registration System'
        },
        content: [{
          type: 'text/html',
          value: html
        }],
        attachments: attachments?.map((url: string) => ({
          content: url, // You need to fetch and convert to base64
          filename: url.split('/').pop(),
          type: 'application/pdf',
          disposition: 'attachment'
        })) || []
      })
    })

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.statusText}`)
    }

    return new Response(
      JSON.stringify({ success: true, participantId }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### D. Set Environment Variable
```bash
# Set SendGrid API Key
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key_here
```

#### E. Deploy Function
```bash
supabase functions deploy send-email-blast
```

#### F. Update EmailTemplates.tsx
Replace simulation code dengan actual API call:

```typescript
// In handleSendEmails function, replace simulation with:
const { data, error } = await supabase.functions.invoke('send-email-blast', {
  body: {
    to: participant.email,
    subject: personalizedSubject,
    html: personalizedBody,
    attachments: sendingTemplate.attachments,
    participantId: participant.id
  }
})

if (error) {
  failed++
  console.error('Failed to send to:', participant.email, error)
} else {
  sent++
  console.log('Sent to:', participant.email)
}
```

---

### Opsi 2: AWS SES (Simple Email Service)

#### Setup
```bash
1. AWS Console → SES → Verify identities
2. Create IAM user dengan SES permissions
3. Get Access Key ID & Secret Access Key
```

#### Edge Function
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!
  }
})

const command = new SendEmailCommand({
  Source: 'noreply@yourdomain.com',
  Destination: { ToAddresses: [to] },
  Message: {
    Subject: { Data: subject },
    Body: { Html: { Data: html } }
  }
})

await ses.send(command)
```

---

### Opsi 3: Mailgun

#### Setup
```bash
1. Daftar di https://mailgun.com
2. Verify domain
3. Get API Key & Domain name
```

#### Edge Function
```typescript
const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY')
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN')

const formData = new FormData()
formData.append('from', `Event <noreply@${MAILGUN_DOMAIN}>`)
formData.append('to', to)
formData.append('subject', subject)
formData.append('html', html)

const response = await fetch(
  `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
    },
    body: formData
  }
)
```

---

## 🎯 QR Code Generation

Untuk generate QR code per participant:

### Install QR Library
```bash
npm install qrcode
```

### Edge Function Addition
```typescript
import QRCode from 'qrcode'

// Generate QR code
const qrCodeDataURL = await QRCode.toDataURL(
  `https://yourdomain.com/checkin?participant=${participantId}`,
  { width: 300 }
)

// Convert to base64 for attachment
const qrAttachment = {
  content: qrCodeDataURL.split(',')[1], // Remove data:image/png;base64,
  filename: `qr-${participantId}.png`,
  type: 'image/png',
  disposition: 'attachment'
}
```

---

## 📊 Monitoring & Analytics

### Track Email Status
Add to participants table:
```sql
ALTER TABLE participants 
ADD COLUMN email_sent BOOLEAN DEFAULT false,
ADD COLUMN email_sent_at TIMESTAMP,
ADD COLUMN email_opened BOOLEAN DEFAULT false,
ADD COLUMN email_opened_at TIMESTAMP;
```

### Update After Sending
```typescript
await supabase
  .from('participants')
  .update({ 
    email_sent: true, 
    email_sent_at: new Date().toISOString() 
  })
  .eq('id', participant.id)
```

### Track Email Opens
Add tracking pixel:
```typescript
const trackingPixel = `<img src="https://yourdomain.com/track-open?id=${participantId}" width="1" height="1" />`
const bodyWithTracking = personalizedBody + trackingPixel
```

---

## 🔒 Security Best Practices

### 1. Rate Limiting
```typescript
// Limit to 10 emails per second
for (let i = 0; i < participants.length; i += 10) {
  const batch = participants.slice(i, i + 10)
  await Promise.all(batch.map(sendEmail))
  await new Promise(resolve => setTimeout(resolve, 1000))
}
```

### 2. Email Validation
```typescript
const isValidEmail = (email: string) => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

if (!isValidEmail(participant.email)) {
  failed++
  continue
}
```

### 3. Unsubscribe Link
```typescript
const unsubscribeLink = `https://yourdomain.com/unsubscribe?id=${participantId}`
const footer = `<p><a href="${unsubscribeLink}">Unsubscribe</a></p>`
```

---

## 🧪 Testing

### 1. Test Email Service
```bash
# Test SendGrid
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Hello"}]}'
```

### 2. Test Edge Function
```bash
supabase functions serve send-email-blast

curl -X POST http://localhost:54321/functions/v1/send-email-blast \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Hello</p>"}'
```

### 3. Test in UI
```
1. Create test participant dengan email Anda sendiri
2. Send email blast
3. Check inbox
```

---

## 💰 Cost Estimation

### SendGrid Pricing
- **Free**: 100 emails/day
- **Essentials**: $19.95/month - 50,000 emails
- **Pro**: $89.95/month - 100,000 emails

### AWS SES Pricing
- **$0.10 per 1,000 emails**
- **Free tier**: 62,000 emails/month (if sent from EC2)

### Mailgun Pricing
- **Free**: 5,000 emails/month (3 months)
- **Foundation**: $35/month - 50,000 emails

---

## 🎉 Next Steps

1. **Pilih email service** (SendGrid recommended untuk start)
2. **Setup account** dan verify domain/sender
3. **Create Supabase Edge Function**
4. **Set environment variables**
5. **Deploy function**
6. **Update EmailTemplates.tsx** untuk call function
7. **Test dengan 1-2 participants**
8. **Monitor logs & fix errors**
9. **Ready untuk production blast!**

---

## 📞 Support

Jika ada error:
1. Check Supabase Functions logs: `supabase functions logs send-email-blast`
2. Check SendGrid activity: Dashboard → Activity
3. Check browser console untuk client errors
4. Verify API keys & environment variables

Good luck! 🚀
