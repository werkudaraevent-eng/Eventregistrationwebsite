# Design Document: User Management & Role-Based Access Control

## Overview

This document describes the technical design for implementing a User Management and Role-Based Access Control (RBAC) system for the Event Registration Website. The system enables granular access control where users can be assigned specific roles and granted access to specific events with view or edit permissions.

## Architecture

The RBAC system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ User Mgmt   │  │ Permission  │  │ Protected           │  │
│  │ Components  │  │ Context     │  │ Components          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth        │  │ Database    │  │ Row Level           │  │
│  │ (Users)     │  │ (Profiles)  │  │ Security (RLS)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Tables

#### user_profiles
Extends Supabase Auth users with application-specific data.

```typescript
interface UserProfile {
  id: string;              // UUID, FK to auth.users
  email: string;           // User email (denormalized for convenience)
  name: string;            // Display name
  role: UserRole;          // User's system role
  is_active: boolean;      // Whether user can log in
  last_login_at: string;   // ISO timestamp
  created_at: string;      // ISO timestamp
  created_by: string;      // UUID of admin who created this user
}

type UserRole = 'super_admin' | 'event_admin' | 'event_viewer' | 'checkin_operator';
```

#### user_event_access
Maps users to events with specific permissions.

```typescript
interface UserEventAccess {
  id: string;              // UUID
  user_id: string;         // FK to user_profiles
  event_id: string;        // FK to events
  permission: Permission;  // Access level
  created_at: string;      // ISO timestamp
  granted_by: string;      // UUID of admin who granted access
}

type Permission = 'view' | 'edit';
```

#### user_audit_log
Tracks all user management activities.

```typescript
interface UserAuditLog {
  id: string;              // UUID
  action: AuditAction;     // Type of action
  target_user_id: string;  // User affected by the action
  performed_by: string;    // Admin who performed the action
  details: object;         // JSON with action-specific details
  created_at: string;      // ISO timestamp
}

type AuditAction = 'user_created' | 'user_updated' | 'user_deactivated' | 
                   'role_changed' | 'access_granted' | 'access_revoked';
```

### 2. React Components

#### UserManagement.tsx
Main component for user management interface (Super Admin only).

```typescript
interface UserManagementProps {
  // No props - uses context for current user
}

// Features:
// - List all users with search/filter
// - Create new user dialog
// - Edit user dialog
// - Deactivate user confirmation
// - View audit logs
```

#### UserEventAccessDialog.tsx
Dialog for managing a user's event access.

```typescript
interface UserEventAccessDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}
```

#### PermissionContext.tsx
React context for permission checking throughout the app.

```typescript
interface PermissionContextValue {
  currentUser: UserProfile | null;
  hasEventAccess: (eventId: string) => boolean;
  canEditEvent: (eventId: string) => boolean;
  isSuperAdmin: () => boolean;
  isLoading: boolean;
}
```

### 3. Permission Utilities

```typescript
// src/utils/permissions.ts

export function canAccessEvent(
  userProfile: UserProfile,
  eventAccess: UserEventAccess[],
  eventId: string
): boolean;

export function canEditEvent(
  userProfile: UserProfile,
  eventAccess: UserEventAccess[],
  eventId: string
): boolean;

export function getAccessibleEvents(
  userProfile: UserProfile,
  eventAccess: UserEventAccess[],
  allEvents: Event[]
): Event[];

export function getRolePermissions(role: UserRole): RolePermissions;
```

## Data Models

### Role Permissions Matrix

| Feature | super_admin | event_admin | event_viewer | checkin_operator |
|---------|-------------|-------------|--------------|------------------|
| View all events | ✓ | - | - | - |
| View assigned events | ✓ | ✓ | ✓ | ✓ |
| Edit participants | ✓ | ✓* | - | - |
| Edit agenda | ✓ | ✓* | - | - |
| Edit branding | ✓ | ✓* | - | - |
| Send emails | ✓ | ✓* | - | - |
| Check-in participants | ✓ | ✓* | - | ✓* |
| Create events | ✓ | - | - | - |
| Delete events | ✓ | - | - | - |
| Manage users | ✓ | - | - | - |
| View audit logs | ✓ | - | - | - |

*Only for assigned events with appropriate permission level

### Database Schema (SQL)

```sql
-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'event_admin', 'event_viewer', 'checkin_operator')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- User event access table
CREATE TABLE user_event_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, event_id)
);

-- Audit log table
CREATE TABLE user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES user_profiles(id),
  performed_by UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_event_access_user ON user_event_access(user_id);
CREATE INDEX idx_user_event_access_event ON user_event_access(event_id);
CREATE INDEX idx_user_audit_log_target ON user_audit_log(target_user_id);
CREATE INDEX idx_user_audit_log_created ON user_audit_log(created_at DESC);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role enum validation
*For any* user profile, the role field must be one of the four valid roles: super_admin, event_admin, event_viewer, or checkin_operator
**Validates: Requirements 1.1**

### Property 2: Super admin full access
*For any* event in the system and any user with super_admin role, the user should have access to that event
**Validates: Requirements 1.2**

### Property 3: Event admin restricted access
*For any* user with event_admin role and any event, the user can only edit events that are in their user_event_access list with edit permission
**Validates: Requirements 1.3**

### Property 4: Event viewer read-only access
*For any* user with event_viewer role and any assigned event, all write operations should be rejected while read operations succeed
**Validates: Requirements 1.4, 3.2**

### Property 5: User creation validation
*For any* user creation request, if email or role is missing, the creation should fail with a validation error
**Validates: Requirements 2.1**

### Property 6: Duplicate email prevention
*For any* user creation request with an email that already exists in the system, the creation should fail with a duplicate error
**Validates: Requirements 2.4**

### Property 7: User profile metadata
*For any* newly created user profile, the created_at and created_by fields should be populated with valid values
**Validates: Requirements 2.5**

### Property 8: Event access permission requirement
*For any* event access assignment, a permission level (view or edit) must be specified
**Validates: Requirements 3.1**

### Property 9: Access revocation immediacy
*For any* user whose event access is revoked, subsequent access attempts to that event should fail
**Validates: Requirements 3.4**

### Property 10: Event list filtering
*For any* non-super-admin user, the list of accessible events should exactly match their user_event_access entries
**Validates: Requirements 3.5**

### Property 11: User list completeness
*For any* user in the user list, the display should include email, name, role, assigned event count, and last login time
**Validates: Requirements 4.2**

### Property 12: User deactivation effect
*For any* deactivated user, authentication attempts should fail while their profile data remains in the database
**Validates: Requirements 4.5**

### Property 13: API authorization enforcement
*For any* API request to access event data, if the requesting user lacks proper permission, the response should be an authorization error
**Validates: Requirements 5.2**

### Property 14: View-only modification prevention
*For any* user with view-only permission attempting to modify event data, the modification should be rejected
**Validates: Requirements 5.4**

### Property 15: Last super admin protection
*For any* attempt to demote or deactivate a super_admin, if they are the last super_admin in the system, the operation should fail
**Validates: Requirements 6.4**

### Property 16: Audit log creation
*For any* user management action (create, update, deactivate, role change, access grant/revoke), an audit log entry should be created with timestamp and performer information
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 17: Audit log chronological order
*For any* audit log query, the results should be returned in descending chronological order (newest first)
**Validates: Requirements 7.4**

## Error Handling

### Authentication Errors
- Invalid credentials: Display "Invalid email or password"
- Account deactivated: Display "Your account has been deactivated. Contact administrator."
- Session expired: Redirect to login with "Session expired. Please log in again."

### Authorization Errors
- No event access: Display "You don't have access to this event"
- Insufficient permission: Display "You don't have permission to perform this action"
- Feature not available: Hide or disable UI elements based on role

### Validation Errors
- Missing required fields: Highlight fields with error messages
- Duplicate email: Display "A user with this email already exists"
- Invalid role: Display "Invalid role selected"

### System Errors
- Database errors: Display generic error with retry option
- Network errors: Display "Connection error. Please check your internet connection."

## Testing Strategy

### Unit Testing
- Test permission utility functions with various role/access combinations
- Test validation functions for user creation and updates
- Test audit log creation for all action types

### Property-Based Testing
Using fast-check library for TypeScript:

- **Role validation**: Generate random strings and verify only valid roles are accepted
- **Access control**: Generate random user/event combinations and verify access rules
- **Audit logging**: Generate random actions and verify logs are created correctly

Each property-based test will:
- Run minimum 100 iterations
- Be tagged with the corresponding correctness property
- Use smart generators that constrain to valid input spaces

### Integration Testing
- Test RLS policies with different user roles
- Test invitation email flow
- Test permission changes propagation

### E2E Testing
- Complete user creation flow
- Event access assignment flow
- Permission enforcement across UI
