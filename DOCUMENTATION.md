# Event Registration Website - Complete Documentation

> Comprehensive event management platform for registrations, check-ins, badges, and email campaigns

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Setup](#project-setup)
3. [Features](#features)
4. [Database Setup](#database-setup)
5. [Email System](#email-system)
6. [Badge System](#badge-system)
7. [QR Code System](#qr-code-system)
8. [Troubleshooting](#troubleshooting)
9. [Development Guide](#development-guide)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- SMTP provider (optional, for emails)

### Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Project Setup

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Email**: Multi-provider (SMTP, SendGrid)
- **QR Codes**: qrcode + html5-qrcode

### Project Structure
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI primitives
│   ├── AdminDashboard.tsx
│   ├── ParticipantManagement.tsx
│   ├── BadgeDesigner.tsx
│   ├── EmailCenter.tsx
│   └── ...
├── utils/              # Utilities
│   ├── supabase/       # Supabase client
│   ├── printUtils.ts   # Print utilities
│   └── ...
└── main.tsx           # Entry point

supabase/
├── functions/          # Edge functions
│   ├── send-email/    # Email service
│   └── track-email/   # Email tracking
└── migrations/        # Database migrations
```

---

## Features

### 1. Event Management
- Create and manage multiple events
- Custom dates, locations, descriptions
- Event-scoped data isolation
- Branding customization per event

### 2. Participant Management
- Public registration forms
- Manual participant addition
- CSV import/export
- Custom fields support
- Real-time updates
- Column management

### 3. Check-In System
- QR code-based attendance tracking
- Standalone check-in page (no login required)
- Search functionality
- Real-time attendance dashboard
- Auto-print badges on check-in

### 4. Badge Designer
- Drag-and-drop visual editor
- Customizable components (text, QR, logo, images)
- Multiple badge sizes (CR80, A4, A6, A7, Custom)
- Print settings (paper size, orientation, margins)
- Live preview
- **Location**: Admin Dashboard → Badge Design tab

### 5. Email System
- Template management with variables
- Multi-provider support (SMTP, SendGrid)
- Bulk email campaigns
- Email tracking (opens, clicks)
- Email history
- Confirmation emails

### 6. Agenda Management
- Session scheduling
- Location tracking
- Attendance per session
- QR code generation per session

---

## Database Setup

### Initial Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Copy URL and anon key to `.env.local`

2. **Run Migrations**
   ```bash
   npm run db:push
   ```

3. **Setup Tables**
   Main tables:
   - `events` - Event information
   - `participants` - Participant data
   - `agenda_items` - Session schedule
   - `email_templates` - Email templates
   - `email_history` - Email tracking
   - `email_config` - Email provider settings

### Email Configuration Table

```sql
-- Setup email config table
CREATE TABLE IF NOT EXISTS email_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_secure BOOLEAN DEFAULT true,
  sendgrid_api_key TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### QR Code Storage

```sql
-- Add QR code column to participants
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true);

-- Storage policy
CREATE POLICY "Public QR code access"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr-codes');
```

---

## Email System

### Setup Email Provider

**Admin Dashboard → Email Settings**

#### SMTP Configuration
```
Host: smtp.gmail.com
Port: 587
Secure: Yes
Username: your-email@gmail.com
Password: your-app-password
From Email: your-email@gmail.com
From Name: Your Event Name
```

#### SendGrid Configuration
```
API Key: SG.xxxxxxxxxxxxx
From Email: your-email@example.com
From Name: Your Event Name
```

### Email Templates

**Admin Dashboard → Templates**

Available variables:
- `{{name}}` - Participant name
- `{{email}}` - Participant email
- `{{eventName}}` - Event name
- `{{eventDate}}` - Event date
- `{{eventLocation}}` - Event location
- `{{qrCodeUrl}}` - QR code image URL
- `{{checkInUrl}}` - Check-in page URL

### Email Tracking

Automatic tracking for:
- Email opens (pixel tracking)
- Link clicks
- Delivery status
- Bounce handling

View history: **Admin Dashboard → Email History**

### Troubleshooting Email Issues

**Email not sending:**
1. Check email config in Email Settings
2. Test connection with "Test Email" button
3. Check Supabase Edge Function logs
4. Verify SMTP credentials

**Email in spam:**
1. Setup SPF/DKIM records
2. Use verified domain
3. Avoid spam trigger words
4. Include unsubscribe link

---

## Badge System

### Badge Designer

**Location**: Admin Dashboard → Badge Design tab

**Features:**
- Drag-and-drop components
- Live preview
- Print settings configuration
- Multiple badge sizes
- Custom backgrounds

**Components:**
- Event Name
- Participant Fields (name, email, company, position)
- QR Code
- Event Logo
- Custom Text

**Print Settings:**
- Paper Size: CR80, A4, A6, A7, Letter, Custom
- Orientation: Portrait, Landscape
- Margins: Configurable
- Preview: Shows badge layout on paper

### Printing Badges

**From Participant Management:**
1. Select participants
2. Click "Print Badges"
3. Browser print dialog opens
4. Print with configured settings

**From Check-In:**
1. Enable "Auto-Print Badge on Check-In"
2. Scan QR or search participant
3. Badge prints automatically after check-in

---

## QR Code System

### QR Code Generation

**Automatic generation:**
- When participant is created
- Stored in Supabase Storage
- URL saved to `qr_code_url` field

**Manual generation:**
```bash
node generate-qr-codes.js
```

### QR Code Usage

**Check-In:**
1. Open standalone check-in page: `?checkin={agendaId}`
2. Click "QR Scan"
3. Scan participant QR code
4. Automatic check-in

**Badge:**
- QR code can be added to badge design
- Contains participant ID
- Used for check-in verification

---

## Troubleshooting

### Common Issues

#### 1. Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### 2. Database Connection Issues
- Verify Supabase URL and key in `.env.local`
- Check Supabase project status
- Verify RLS policies

#### 3. Email Not Sending
- Check email config in Email Settings
- Test SMTP connection
- Check Supabase Edge Function logs
- Verify email provider credentials

#### 4. QR Code Not Generating
- Check Supabase Storage bucket exists
- Verify storage policies
- Check participant has valid ID

#### 5. Print Not Working
- Check badge template is saved
- Verify print configuration
- Test browser print permissions
- Check CSS @page support

### Error Messages

**"SelectItem value cannot be empty string"**
- Fixed: SelectItem now uses non-empty value
- Location: ParticipantManagement.tsx

**"Agenda missing eventId"**
- Ensure agenda items have eventId field
- Run migration to add eventId column

**"Cross-event check-in prevented"**
- Security feature working correctly
- Participant must belong to event

---

## Development Guide

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Database Migrations
```bash
# Push local migrations to Supabase
npm run db:push

# Pull remote schema from Supabase
npm run db:pull

# List migration status
npm run db:status
```

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting
- Tailwind CSS for styling

### Key Conventions
- Component files: PascalCase.tsx
- Utility files: camelCase.ts
- ID format: `{prefix}-{timestamp}-{random}`
  - Events: `evt-1730900000-abc123`
  - Participants: `prt-1730900000-xyz789`
  - Agenda: `agd-1730900000-efg456`

### Adding New Features

1. **Create spec** (optional but recommended)
   ```bash
   # Create spec directory
   mkdir -p .kiro/specs/feature-name
   
   # Create requirements, design, tasks
   touch .kiro/specs/feature-name/requirements.md
   touch .kiro/specs/feature-name/design.md
   touch .kiro/specs/feature-name/tasks.md
   ```

2. **Implement feature**
   - Create components in `src/components/`
   - Add utilities in `src/utils/`
   - Update types in `src/utils/localDBStub.ts`

3. **Add to dashboard**
   - Update `AdminDashboard.tsx`
   - Add new tab if needed
   - Wire up routing

4. **Test**
   - Write unit tests
   - Test in browser
   - Test with real data

---

## Recent Changes

### Badge Design Reorganization (Latest)
- **Moved**: Badge Designer from Standalone Check-In to Admin Dashboard
- **New Tab**: "Badge Design" in Admin Dashboard
- **Cleaned**: Standalone Check-In now focuses only on check-in operations
- **Benefit**: Better separation of concerns

### UI Improvements
- Fixed width sidebars (340px) for consistency
- Reduced spacing throughout interface
- Smaller print preview (200px vs 300px)
- Added padding to canvas text components
- Improved typography and spacing scale

### Bug Fixes
- Fixed SelectItem empty value error
- Fixed email template selection
- Improved error handling
- Enhanced security checks

---

## Support & Resources

### Documentation Files
- This file: Complete documentation
- `README.md`: Project overview
- `.kiro/steering/`: Development guidelines
- `.kiro/specs/`: Feature specifications

### Useful Commands
```bash
# Development
npm run dev              # Start dev server

# Build
npm run build            # Production build

# Database
npm run db:push          # Push migrations
npm run db:pull          # Pull schema
npm run db:status        # Migration status

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:ui          # Test UI
```

### Getting Help
1. Check this documentation
2. Review error messages in console
3. Check Supabase logs
4. Review recent changes in git history

---

**Last Updated**: December 2024
**Version**: 1.0.0
