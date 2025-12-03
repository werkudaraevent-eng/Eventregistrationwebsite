# Product Overview

Event Registration Website is a comprehensive event management platform that enables organizers to create events, manage participants, handle registrations, and track attendance.

## Core Features

- **Event Management**: Create and manage multiple events with custom dates, locations, and descriptions
- **Participant Registration**: Public registration forms with customizable fields and automatic QR code generation
- **Check-In System**: QR code-based attendance tracking for agenda items
- **Badge Designer**: Visual badge customization tool for event credentials
- **Email System**: Multi-provider email support (SMTP, SendGrid) with templates, tracking, and blast campaigns
- **Admin Dashboard**: Centralized management interface for event organizers
- **Branding Customization**: Per-event branding with logos, colors, and fonts

## Architecture

The application uses Supabase as the backend (database, authentication, storage, edge functions) with a React frontend. Public pages (registration, check-in) work without authentication via event-scoped URLs, while admin features require authentication.
