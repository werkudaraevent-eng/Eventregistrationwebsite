# AI Coding Agent Instructions - Event Registration Website

## Project Architecture

This is a **React + TypeScript + Vite** event management platform that underwent a critical migration from localStorage to Supabase. The system supports public registration, admin dashboards, and QR-based check-in.

### Critical Architectural Principle: URL-Based Context

**NEVER rely on session storage for public pages.** The fundamental architectural pattern is:

```typescript
// ❌ WRONG: Session-dependent
const eventId = localStorage.getItem('selectedEventId');

// ✅ CORRECT: URL-based context
const eventId = props.eventId; // From URL parameter
```

All standalone pages (registration, check-in) MUST receive context via URL parameters, not localStorage or session state. See `src/ARCHITECTURE_FIX.md` for the complete rationale.

### Routing Patterns

The app uses hash-based client-side routing WITHOUT a routing library:

- **Public Registration**: Via URL hash or query parameter (eventId required)
- **Check-in Dashboard**: Via query parameter `checkin` with agendaId
- **Badge Designer**: Via URL hash or query parameter (eventId required)
- **Admin Area**: Authenticated session only (no URL param)

Routes are parsed in `App.tsx` via `useEffect()` watching `window.location.hash` and URL params.

## Data Layer & Database

### Dual Data Modules (Transition Period)

1. **`utils/supabaseDataLayer.ts`** - Primary production data layer (Supabase)
2. **`utils/localDBStub.ts`** - Legacy localStorage interface (being phased out)

**Always use Supabase functions** unless specifically maintaining backward compatibility.

### Database Schema (snake_case)

Tables: `events`, `participants`, `agenda_items`

```typescript
// TypeScript (camelCase) → Database (snake_case) mapping:
eventId → event_id
startDate → start_date
registeredAt → registered_at
customData → custom_data (JSONB)
```

All tables use **text-based IDs** with prefixes:
- Events: `E1730567890ABCD` 
- Participants: `P1730567890WXYZ`
- Agenda: `A1730567890123`

Generate via `generateEventId()`, `generateParticipantId()`, `generateAgendaId()` from `supabaseDataLayer.ts`.

### Data Access Pattern

```typescript
// ALWAYS scope queries by eventId from URL:
const { data } = await supabase
  .from('participants')
  .select('*')
  .eq('event_id', eventIdFromUrl); // NOT from session!
```

Row Level Security (RLS) is permissive - relies on URL-based access control, not database-level security.

## Component Architecture

### Page Component Categories

1. **Public Pages** (no auth): `PublicRegistrationForm`, `StandaloneCheckInPage`
   - Receive `eventId` or `agendaId` as props
   - Load data from Supabase using URL context
   - Apply custom branding from `event.branding` JSONB

2. **Admin Pages** (auth required): `AdminDashboard`, `EventSelection`, `ParticipantManagement`
   - Session-based authentication via Supabase Auth
   - Manage events after login

3. **Hybrid Pages**: `BadgeDesigner`
   - Can be accessed standalone via URL or from admin dashboard

### Custom Branding System

Events store branding in `events.branding` (JSONB):
```typescript
interface BrandingSettings {
  logoUrl?: string;
  logoAlignment: 'left' | 'center' | 'right';
  logoSize: 'small' | 'medium' | 'large';
  primaryColor: string;
  backgroundColor: string;
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  customHeader?: string;
}
```

Public pages apply branding dynamically via inline styles (see `PublicRegistrationForm.tsx`).

## Development Workflow

### Running the Project

```bash
npm i                    # Install dependencies
npm run dev             # Start dev server (Vite)
```

No build step required for development. Vite handles HMR.

### Environment Setup

Required `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app will **throw on startup** if these are missing (`utils/supabase/client.tsx`).

### Authentication Flow

- **Admin login**: Supabase Auth via email/password
- **Public access**: No authentication - relies on event URLs being "secret"
- Admin users created via Supabase dashboard (no self-signup UI)

## Key Conventions

### TypeScript Patterns

- **Strict mode enabled** - no implicit any
- **Interface over type** for data models
- **Explicit function return types** preferred for exported functions
- **React Hook Form** used for complex forms (see `RegistrationForm.tsx`)

### UI Components

All UI components from `components/ui/*` are **shadcn/ui** with Radix primitives:
- Use `cn()` utility from `components/ui/utils.ts` for conditional classes
- Tailwind CSS for styling (no CSS modules)
- Gradient styles use custom Tailwind classes: `gradient-primary`, `gradient-primary-soft`

### State Management

**No global state library**. State patterns:
- Component state via `useState`
- Shared state lifted to `App.tsx`
- Server state fetched directly in components (no React Query)
- Real-time updates via Supabase subscriptions (see `ParticipantManagement.tsx`)

### Error Handling

Components display errors inline via `Alert` component (shadcn):
```typescript
const [error, setError] = useState<string | null>(null);
// ... on error:
setError('User-friendly message here');
```

Console errors use prefixed logging: `console.error('[COMPONENT_NAME] Error:', err);`

## Data Migration Context

The system recently migrated from localStorage to Supabase. Migration tools exist in `utils/dataMigration.ts` but are **only for historical data**. All new features should:

1. Use Supabase directly (never localStorage)
2. Assume URL-based context
3. Test standalone page access (different browser/device)

If you see TODOs referencing "Replace with Supabase", those indicate incomplete migration areas.

## Testing Workflow

No automated tests exist. Manual testing checklist for changes:

1. **Admin dashboard** - Create/edit entities
2. **Public registration** - Open registration URL in incognito window
3. **Check-in page** - Open check-in URL on different device
4. **Cross-device** - Verify changes sync across browsers

## Common Pitfalls

❌ Using `localStorage` for new features → Use Supabase  
❌ Assuming admin context on public pages → Pass `eventId` via props  
❌ Database column names in camelCase → Use snake_case  
❌ Hardcoded colors/branding → Read from `event.branding`  
❌ Importing both data layers → Use only `supabaseDataLayer.ts`  

## File Organization

- `components/*.tsx` - Page-level components
- `components/ui/*.tsx` - Reusable UI primitives (shadcn)
- `utils/supabaseDataLayer.ts` - Database interface
- `utils/supabase/client.tsx` - Supabase client singleton
- `src/*.md` - Migration guides and architecture docs (historical)
