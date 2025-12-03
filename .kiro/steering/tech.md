# Tech Stack

## Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6 with SWC plugin for fast compilation
- **UI Library**: Radix UI primitives with custom components
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks (useState, useEffect)
- **Routing**: Hash-based routing via URL parameters and hash fragments
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Notifications**: Sonner (toast notifications)
- **QR Codes**: qrcode library for generation, html5-qrcode for scanning
- **Drag & Drop**: react-dnd with HTML5 backend
- **Charts**: Recharts

## Backend

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for QR codes, logos, attachments)
- **Edge Functions**: Supabase Functions (Deno runtime)
- **Email**: Multi-provider support via edge functions

## Development

- **TypeScript**: Strict mode enabled with ES2020 target
- **Path Aliases**: `@/*` maps to `./src/*` (configured but not actively used)
- **Module Resolution**: Bundler mode
- **Linting**: TypeScript strict checks including noUnusedLocals and noUnusedParameters

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build
npm run build            # Production build to dist/

# Database
npm run db:push          # Push local migrations to Supabase
npm run db:pull          # Pull remote schema from Supabase
npm run db:status        # List migration status

# Installation
npm i                    # Install dependencies
```

## Environment Variables

Required in `.env.local`:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

## Deployment

- **Platform**: Netlify (configured via netlify.toml)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
