# Documentation Archive

> This file lists old documentation files that have been consolidated into DOCUMENTATION.md
> These files can be safely deleted after verification

## 📋 Consolidated Documentation

All documentation has been consolidated into **DOCUMENTATION.md**

## 🗂️ Files That Can Be Archived/Deleted

### Email Setup & Configuration
- `EMAIL_BLAST_SETUP.md` → See DOCUMENTATION.md § Email System
- `EMAIL_CENTER_SETUP.md` → See DOCUMENTATION.md § Email System
- `EMAIL_CONFIG_CMS_GUIDE.md` → See DOCUMENTATION.md § Email System
- `EMAIL_HISTORY_SETUP.md` → See DOCUMENTATION.md § Email System
- `EMAIL_MULTI_PROVIDER_GUIDE.md` → See DOCUMENTATION.md § Email System
- `EMAIL_MULTI_PROVIDER_QUICKSTART.md` → See DOCUMENTATION.md § Email System
- `EMAIL_TEMPLATES_SETUP.md` → See DOCUMENTATION.md § Email System
- `EMAIL_TRACKING_COMPLETE.md` → See DOCUMENTATION.md § Email System
- `EMAIL_TRACKING_GUIDE.md` → See DOCUMENTATION.md § Email System
- `SENDGRID_QUICK_REF.md` → See DOCUMENTATION.md § Email System
- `SENDGRID_SETUP.md` → See DOCUMENTATION.md § Email System

### Email Debugging & Fixes
- `DEBUG_SMTP_TIMEOUT.md` → See DOCUMENTATION.md § Troubleshooting
- `EMAIL_CONFIRMATION_DEBUG.md` → See DOCUMENTATION.md § Troubleshooting
- `EMAIL_NOT_IN_INBOX_FIX.md` → See DOCUMENTATION.md § Troubleshooting
- `FIX_EMAIL_500_ERROR.md` → See DOCUMENTATION.md § Troubleshooting
- `FIX_EMAIL_BLAST_ERROR.md` → See DOCUMENTATION.md § Troubleshooting
- `FIX_EMAIL_CONFIG_ERRORS.md` → See DOCUMENTATION.md § Troubleshooting

### QR Code System
- `ATTACHMENTS_QR_UPDATE.md` → See DOCUMENTATION.md § QR Code System
- `ATTACHMENTS_SETUP.md` → See DOCUMENTATION.md § QR Code System
- `QR_CODE_ATTACHMENT_TEST.md` → See DOCUMENTATION.md § QR Code System
- `QR_STORAGE_IMPLEMENTATION.md` → See DOCUMENTATION.md § QR Code System
- `FIX_QR_COLUMN.md` → See DOCUMENTATION.md § QR Code System

### Database & Migration
- `MIGRATION_COMPLETE.md` → See DOCUMENTATION.md § Database Setup
- `MIGRATION_INSTRUCTIONS.md` → See DOCUMENTATION.md § Database Setup
- `RUN_MIGRATION_EMAIL_CONFIG.md` → See DOCUMENTATION.md § Database Setup
- `RUN_MIGRATION_NOW.md` → See DOCUMENTATION.md § Database Setup
- `SUPABASE_MIGRATE.md` → See DOCUMENTATION.md § Database Setup
- `SUPABASE_SETUP.md` → See DOCUMENTATION.md § Database Setup

### UI Fixes
- `DYNAMIC_PARTICIPANT_FORMS.md` → Implemented
- `FIX_CUSTOM_FIELDS_TABLE_AND_DATE.md` → Fixed
- `FIX_UPLOAD_ERROR.md` → Fixed
- `INSTANT_FIX_ACTIVATE_ERROR.md` → Fixed
- `SCROLLABLE_DIALOGS_FIX.md` → Fixed
- `SMTP_SECURE_TOGGLE_UI.md` → Implemented

### Setup Guides
- `ID_GENERATION_GUIDE.md` → See DOCUMENTATION.md § Development Guide
- `PUBLIC_REGISTRATION_GUIDE.md` → See DOCUMENTATION.md § Features
- `REALTIME_SETUP.md` → See DOCUMENTATION.md § Features

## 🗄️ SQL Files (Keep for Reference)

These SQL files should be kept as they may be needed for manual database operations:

### Setup Scripts
- `SETUP_EMAIL_CONFIG_TABLE.sql`
- `CREATE_EMAIL_HISTORY_TABLE.sql`
- `ADD_QR_CODE_COLUMN.sql`
- `ENABLE_QR_FOR_TEMPLATE.sql`

### Migration Scripts
- `UPDATE_EMAIL_CONFIG_ADD_GMAIL.sql`
- `UPDATE_EMAIL_STATUS_ADD_OPENED.sql`
- `UPGRADE_EMAIL_CONFIG_MULTI_PROVIDER.sql`
- `UPGRADE_EMAIL_CONFIG_SAFE.sql`

### Fix Scripts
- `FIX_EMAIL_TRACKING_SCHEMA.sql`
- `FIX_PARTICIPANT_EMAILS_RLS.sql`
- `FIX_STORAGE_POLICY.sql`
- `FIX_TRACKING_RLS_POLICY.sql`
- `DISABLE_RLS_TEMP.sql`
- `RE_ENABLE_RLS_PROPER.sql`

### Test Scripts
- `CHECK_TRACKING_SETUP.sql`
- `TEST_MANUAL_TRACKING.sql`
- `TEST_QR_ATTACHMENT.sql`
- `TEST_SMTP_IN_SUPABASE.sql`
- `VERIFY_CURRENT_POLICIES.sql`

## 🧪 Test Files (Keep)

- `test-email-tracking.html`
- `test-link-tracking.html`
- `test-tracking-debug.html`
- `test-tracking-pixel.html`
- `test-tracking-simple.html`
- `Testing.md`

## 📜 Scripts (Keep)

- `generate-qr-codes.js`
- `run-migration.js`
- `redeploy-edge-function.ps1`

## ✅ Action Items

1. **Review DOCUMENTATION.md** - Ensure all important info is captured
2. **Backup old files** - Move to `/docs/archive/` folder (optional)
3. **Delete consolidated files** - Remove files listed above
4. **Update README.md** - Point to DOCUMENTATION.md

## 🔄 Migration Command

To clean up old documentation files:

```bash
# Create archive folder
mkdir -p docs/archive

# Move old MD files to archive
mv EMAIL_*.md docs/archive/
mv FIX_*.md docs/archive/
mv *_SETUP.md docs/archive/
mv *_GUIDE.md docs/archive/
mv MIGRATION_*.md docs/archive/
mv QR_*.md docs/archive/
mv SUPABASE_*.md docs/archive/
mv SENDGRID_*.md docs/archive/
mv DYNAMIC_*.md docs/archive/
mv INSTANT_*.md docs/archive/
mv SCROLLABLE_*.md docs/archive/
mv SMTP_*.md docs/archive/
mv PUBLIC_*.md docs/archive/
mv REALTIME_*.md docs/archive/
mv ID_*.md docs/archive/
mv DEBUG_*.md docs/archive/
mv ATTACHMENTS_*.md docs/archive/
mv RUN_*.md docs/archive/

# Or simply delete them
# rm EMAIL_*.md FIX_*.md *_SETUP.md ...
```

---

**Note**: Before deleting any files, ensure DOCUMENTATION.md contains all necessary information!
