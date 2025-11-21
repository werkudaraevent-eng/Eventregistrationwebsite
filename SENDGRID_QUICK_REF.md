# 🎯 Quick Reference - SendGrid Setup

## ⚡ Fast Track (15 menit)

### 1. SendGrid API Key (3 menit)
```
1. https://sendgrid.com → Login
2. Settings → API Keys → Create API Key
3. Name: "Event System"
4. Permissions: Full Access
5. COPY KEY (simpan di notepad!)
```

### 2. Verify Sender (2 menit + tunggu email)
```
1. Settings → Sender Authentication
2. Verify a Single Sender
3. From Email: YOUR_EMAIL@domain.com
4. Fill form → Create
5. Check inbox → Click verify link
```

### 3. Deploy Function (5 menit)
```
Dashboard Method (RECOMMENDED):
1. https://supabase.com/dashboard
2. Your Project → Edge Functions
3. Deploy new function
4. Name: send-email
5. Copy code from: supabase/functions/send-email/index.ts
6. Deploy
```

### 4. Set Secrets (2 menit)
```
Supabase Dashboard → Project Settings → Edge Functions → Secrets

Add 2 secrets:
┌──────────────────────┬─────────────────────────────────┐
│ SENDGRID_API_KEY     │ SG.xxxxxxxxxxxxx (dari step 1)  │
│ SENDER_EMAIL         │ YOUR_EMAIL@domain.com (step 2)  │
└──────────────────────┴─────────────────────────────────┘
```

### 5. Test (3 menit)
```
Option 1 - Via Dashboard:
  Edge Functions → send-email → Invoke
  Body: {"to":"YOUR_EMAIL","subject":"Test","html":"<h1>Works!</h1>"}
  
Option 2 - Via App:
  Participants tab → Click 📧 icon → Send
  Check your inbox!
```

---

## 🔑 Important Values

**Yang WAJIB Anda punya:**
- ✅ SendGrid API Key (format: `SG.xxxxxxxxxxxxxxxxxxxxxxx`)
- ✅ Verified Sender Email (contoh: `noreply@yourdomain.com`)
- ✅ Supabase Project Ref (lihat di Settings → General)

---

## 🚨 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "SENDGRID_API_KEY not configured" | Set secret di Supabase Dashboard |
| "403 Forbidden" | Verify sender email di SendGrid |
| "Invalid email format" | Check participant email valid |
| Emails ke Spam | Verify domain (bukan single sender) |
| "100 emails/day exceeded" | Upgrade SendGrid plan |

---

## 📍 Where Things Are

```
Your Project Structure:
├── supabase/
│   └── functions/
│       ├── send-email/
│       │   └── index.ts          ← Edge function code
│       └── _shared/
│           └── cors.ts            ← CORS helper
├── src/
│   └── components/
│       ├── ParticipantManagement.tsx  ← Individual send
│       └── EmailTemplates.tsx         ← Mass blast + test
├── SENDGRID_SETUP.md              ← Full setup guide
└── SENDGRID_QUICK_REF.md          ← This file (quick ref)
```

---

## ✅ Pre-Flight Checklist

Before first production blast:

- [ ] SendGrid API Key obtained & saved
- [ ] Sender email verified (check inbox!)
- [ ] Edge function deployed to Supabase
- [ ] Secrets set (SENDGRID_API_KEY, SENDER_EMAIL)
- [ ] Test function via dashboard (success!)
- [ ] Test send to yourself (email received!)
- [ ] Check spam folder (should be in inbox)
- [ ] Database migration 007 run (email tracking)
- [ ] Ready to blast! 🚀

---

## 🎬 Video Walkthrough (If Stuck)

**Deploy Edge Function via Dashboard:**
1. Copy entire content of `supabase/functions/send-email/index.ts`
2. Go to Supabase Dashboard
3. Edge Functions → New Function
4. Paste code → Deploy
5. Done!

**Set Secrets:**
1. Project Settings (gear icon bottom left)
2. Edge Functions tab
3. Scroll to "Secrets"
4. Add → Name: SENDGRID_API_KEY → Value: (paste key)
5. Add → Name: SENDER_EMAIL → Value: your@email.com
6. Save

---

## 💡 Pro Tips

1. **Test with yourself first** - Add your email as participant
2. **Check spam folder** - First emails might go there
3. **Use professional email** - Gmail/Yahoo sender = spam risk
4. **Monitor SendGrid Activity** - Dashboard shows delivery status
5. **Rate limit aware** - Free tier = 100/day max
6. **Email templates** - HTML works, test render first

---

## 🆘 Need Help?

**Check logs:**
```powershell
# Via Supabase Dashboard:
Edge Functions → send-email → Logs tab

# Via CLI:
supabase functions logs send-email
```

**Verify setup:**
1. API Key starts with `SG.`
2. Sender email has green checkmark in SendGrid
3. Secrets show in Supabase (masked values)
4. Function shows "deployed" status

---

## 🎉 Success Looks Like

**After successful send:**
```
Console log:
  ✅ Email sent successfully to: user@example.com

Participant table:
  Email Status: Sent (green badge)
  Last Sent: 2025-11-12 10:30 AM
  Send Count: 1

SendGrid Activity:
  Status: Delivered
  Opens: 1
  Clicks: 0
```

---

Ready? Open `SENDGRID_SETUP.md` for detailed walkthrough! 🚀
