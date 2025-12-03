# Project Structure

## Root Directory

- `src/` - Application source code
- `supabase/` - Supabase configuration and migrations
- `.supabase/` - Local Supabase runtime config
- `build/` - Build artifacts
- Various `.md` files - Setup guides and documentation for features

## Source Organization (`src/`)

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI primitives (Radix-based)
│   ├── figma/          # Figma-specific components
│   └── *.tsx           # Feature components (Admin, Email, Registration, etc.)
├── utils/              # Utility functions and services
│   └── supabase/       # Supabase client configuration
├── styles/             # Global styles
├── guidelines/         # Development guidelines
└── main.tsx           # Application entry point
```

## Key Components

### Admin Components
- `AdminDashboard.tsx` - Main admin interface
- `EventSelection.tsx` - Event picker for admins
- `DedicatedAdminLogin.tsx` - Authentication page
- `ParticipantManagement.tsx` - Participant CRUD operations
- `AgendaManagement.tsx` - Agenda item management
- `EmailCenter.tsx`, `EmailTemplates.tsx`, `EmailHistory.tsx` - Email features
- `BlastCampaigns.tsx`, `CreateCampaignWizard.tsx` - Email campaigns
- `BrandingSettings.tsx` - Event branding customization
- `BadgeDesigner.tsx` - Visual badge editor
- `ColumnManagement.tsx` - Table column visibility

### Public Components
- `PublicRegistrationForm.tsx` - Public event registration
- `StandaloneCheckInPage.tsx` - QR-based check-in
- `AttendanceScanner.tsx` - QR code scanner
- `CheckInPage.tsx` - Check-in interface

### UI Components (`components/ui/`)
Radix UI-based primitives: dialog, button, input, select, table, tabs, card, etc.

## Data Layer (`utils/`)

- `supabaseDataLayer.ts` - Centralized data access layer with typed interfaces
- `supabase/client.tsx` - Supabase client initialization
- `dataMigration.ts` - Data migration utilities
- `logger.ts` - Logging utilities
- `localDBStub.ts` - Local storage fallback (legacy)

## Supabase Structure (`supabase/`)

```
supabase/
├── functions/          # Edge functions
│   ├── send-email/    # Email sending service
│   ├── track-email/   # Email tracking (opens, clicks)
│   └── _shared/       # Shared utilities (CORS)
└── migrations/        # Database schema migrations
```

## Routing Pattern

The app uses hash-based and query parameter routing:
- Admin: `/?event={eventId}` or root for login
- Registration: `#/register/{eventId}` or `?register={eventId}`
- Check-in: `?checkin={agendaId}`
- Badge Designer: `#/designer/{eventId}` or `?designer={eventId}`

## ID Generation

All entities use structured IDs: `{prefix}-{timestamp}-{random}`
- Events: `evt-1730900000-abc123d4`
- Participants: `prt-1730900000-xyz789w2`
- Agenda: `agd-1730900000-efg456h8`
- Custom Fields: `fld-1730900000-qwe123r5`

## Conventions

- TypeScript strict mode throughout
- Functional components with hooks
- Supabase for all data persistence (no localStorage for production data)
- Event-scoped security model
- Console logs disabled in production (except errors/warnings)
