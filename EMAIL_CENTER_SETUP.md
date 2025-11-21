# 🚀 Email Center Setup Guide

## ✅ What's Implemented

### 1. **Email Center Tab** - NEW! ⭐
A dedicated tab for email campaign management and monitoring with:

#### 📊 Dashboard Statistics
- **Total Sent**: Count of successfully sent emails with delivery rate
- **Failed**: Emails that failed to send (need attention)
- **Pending**: Emails in queue waiting to be sent  
- **Not Sent**: Participants who haven't received any emails

#### 📧 Email History
- Complete log of all emails sent to participants
- Filter by status (sent, delivered, opened, clicked, failed, pending, bounced)
- Sortable table with participant info, template used, subject, status, timestamp
- **Detail modal** - Click "Details" button to view:
  - Full delivery information
  - Error messages (if failed)
  - Open/click tracking timestamps
  - Template used

#### ⚡ Quick Actions
- **Resend Failed Emails**: Retry sending to all participants with failed deliveries
- **Send to New Participants**: Send welcome emails to participants who haven't received any
- **Schedule Campaign**: (Coming soon) Schedule emails for specific date/time

#### 📈 Analytics
- (Coming soon) Email performance metrics, open rates, click rates, engagement trends

---

## 🗄️ Database Setup

### Step 1: Run SQL Migration

You need to run the migration **007_add_email_tracking.sql** in Supabase SQL Editor.

#### Option A: Via Supabase Dashboard (Recommended)

```bash
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy contents from: supabase/migrations/007_add_email_tracking.sql
6. Paste into SQL Editor
7. Click "Run" button
8. Verify success message
```

#### Option B: Via Supabase CLI

```powershell
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
```

### Step 2: Verify Migration

Run this query in SQL Editor to verify:

```sql
-- Check new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'participants' 
  AND column_name IN ('email_status', 'last_email_sent_at', 'email_send_count');

-- Check email_logs table
SELECT * FROM email_logs LIMIT 1;

-- Check email_statistics view
SELECT * FROM email_statistics;
```

Expected results:
- ✅ 5 new columns in `participants` table
- ✅ `email_logs` table exists
- ✅ `email_statistics` view exists
- ✅ Function `update_participant_email_status` exists

---

## 🎯 Migration Details

### New Columns in `participants` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `email_status` | TEXT | 'not_sent' | Current email delivery status |
| `last_email_sent_at` | TIMESTAMPTZ | NULL | Timestamp of last email sent |
| `last_email_template_id` | UUID | NULL | Reference to last template used |
| `email_send_count` | INTEGER | 0 | Total emails sent to participant |
| `email_last_error` | TEXT | NULL | Last error message if failed |

**Possible `email_status` values:**
- `not_sent` - No email sent yet (default)
- `sent` - Email sent successfully
- `failed` - Email sending failed
- `pending` - Email in queue

### New `email_logs` Table

Complete history of all email deliveries:

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  participant_id TEXT REFERENCES participants(id),
  template_id UUID REFERENCES email_templates(id),
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,  -- sent, failed, pending, bounced, delivered, opened, clicked
  error_message TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB
);
```

### New `email_statistics` View

Aggregated statistics query-able via:

```sql
SELECT * FROM email_statistics;
```

Returns:
- `total_sent`, `total_failed`, `total_pending`, `total_not_sent`
- `total_participants`
- `delivery_rate` (percentage)
- `last_email_sent` (timestamp)

### New Function: `update_participant_email_status`

Helper function to update participant status and create log entry in one transaction:

```sql
SELECT update_participant_email_status(
  'P1234567890ABCD',           -- participant_id
  'uuid-template-id',          -- template_id  
  'Welcome Email',             -- template_name
  'Welcome to our event!',     -- subject
  'sent',                      -- status
  NULL                         -- error_message (optional)
);
```

This function:
1. Updates `participants` table with new email status
2. Increments `email_send_count`
3. Creates new entry in `email_logs` table
4. All in a single atomic transaction

---

## 🧪 Testing the Email Center

### 1. Access Email Center Tab

```
1. Login to Admin Dashboard
2. Select an event
3. Click "Email Center" tab (new tab with BarChart icon)
```

### 2. View Statistics Dashboard

Should show:
- Statistics cards (initially all zeros for new events)
- Last email sent timestamp (if any emails sent)

### 3. View Email History

- Initially empty (no logs yet)
- After sending emails via Email Templates tab, logs will appear here

### 4. Test Quick Actions

**Resend Failed Emails:**
- Button disabled if no failed emails
- (Will be functional after email service integration)

**Send to New Participants:**
- Button disabled if all participants have received emails
- (Will be functional after email service integration)

---

## 🔄 Integration with Email Templates

When you send emails via **Email Templates** tab:

1. Email blast sends emails (currently simulation)
2. **TODO**: Update to call `update_participant_email_status()` function
3. This will:
   - Update participant email status
   - Create log entries in `email_logs`
   - Statistics automatically update
   - Email Center displays real-time data

### Next Step: Update EmailTemplates.tsx

In the `handleSendEmails` function, replace simulation code with:

```typescript
// After successful email send (when actual email service is configured)
await supabase.rpc('update_participant_email_status', {
  p_participant_id: participant.id,
  p_template_id: sendingTemplate.id,
  p_template_name: sendingTemplate.name,
  p_subject: personalizedSubject,
  p_status: 'sent',  // or 'failed' if error
  p_error_message: null  // or error.message if failed
});
```

---

## 📊 Data Flow

```
┌─────────────────────┐
│ Email Templates Tab │
│  (Send Emails)      │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ update_participant_email_status()    │
│ - Updates participants.email_status  │
│ - Increments email_send_count        │
│ - Creates email_logs entry           │
└──────────┬───────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Email Center Tab   │
│  - Reads stats      │
│  - Shows logs       │
│  - Quick actions    │
└─────────────────────┘
```

---

## 🎨 UI Features

### Tabs Structure

```
Email Center
├── Email History (Default)
│   ├── Statistics cards (4 cards)
│   ├── Last activity alert
│   ├── Filter dropdown (by status)
│   └── Email logs table
│       ├── Participant name & email
│       ├── Template used
│       ├── Subject
│       ├── Status badge
│       ├── Timestamp
│       └── Details button → Modal
├── Quick Actions
│   ├── Resend Failed Emails card
│   ├── Send to New Participants card
│   └── Schedule Campaign card (coming soon)
└── Analytics (Coming Soon)
    └── Placeholder for charts/metrics
```

### Status Badges

Visual color-coded badges:
- 🔵 **Sent** - Blue
- ✅ **Delivered** - Green
- 👁️ **Opened** - Purple
- 📊 **Clicked** - Indigo
- ❌ **Failed** - Red
- ⏳ **Pending** - Yellow
- ⚠️ **Bounced** - Orange

---

## 🚧 What's Next

### Phase 1: Database ✅ DONE
- [x] Migration file created
- [x] Tables and views designed
- [x] Helper function created

### Phase 2: Email Center UI ✅ DONE
- [x] Dashboard component
- [x] Statistics cards
- [x] Email history table
- [x] Filtering and sorting
- [x] Detail modal
- [x] Quick actions UI

### Phase 3: Integration (TODO)
- [ ] Update EmailTemplates.tsx to log sends
- [ ] Update handleSendEmails to call RPC function
- [ ] Update handleSendTestEmail to log test sends
- [ ] Real-time updates via Supabase subscriptions

### Phase 4: Email Service Integration (TODO)
- [ ] Configure SendGrid/AWS SES/Mailgun
- [ ] Implement actual email sending
- [ ] Track delivery status
- [ ] Track open/click events
- [ ] Webhook handlers for status updates

### Phase 5: Advanced Features (TODO)
- [ ] Scheduled campaigns
- [ ] Email templates versioning
- [ ] A/B testing
- [ ] Advanced analytics (open rate, click rate, conversion)
- [ ] Export reports

---

## 🎉 Ready to Use!

After running the migration:

1. ✅ **Refresh your application**
2. ✅ **Go to Email Center tab**
3. ✅ **See dashboard (initially empty)**
4. ✅ **Send emails via Email Templates tab**
5. ✅ **Check Email Center for stats & logs** (after integration is complete)

The foundation is ready! Now you can:
- Monitor email campaigns
- Track delivery status
- Analyze performance
- Take quick actions on failed/pending emails

---

## 💡 Tips

### For Testing
```sql
-- Manually set some test statuses
UPDATE participants 
SET email_status = 'sent', 
    last_email_sent_at = NOW() - INTERVAL '2 hours',
    email_send_count = 1
WHERE id IN (SELECT id FROM participants LIMIT 3);

-- Insert test log
INSERT INTO email_logs (participant_id, template_name, subject, status)
SELECT id, 'Test Template', 'Test Subject', 'sent'
FROM participants LIMIT 1;

-- View updated stats
SELECT * FROM email_statistics;
```

### For Debugging
```sql
-- Check participant email status
SELECT name, email, email_status, last_email_sent_at, email_send_count
FROM participants;

-- Check recent logs
SELECT * FROM email_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- Count by status
SELECT email_status, COUNT(*) 
FROM participants 
GROUP BY email_status;
```

---

Good luck! 🚀 Your Email Center is ready to rock! 📧
