# Implementation Plan

## Phase 1: Database Setup

- [x] 1. Create database migration for RBAC tables





  - [ ] 1.1 Create user_profiles table with role enum constraint
    - Define table structure with id, email, name, role, is_active, timestamps

    - Add foreign key to auth.users
    - _Requirements: 1.1, 2.5_
  - [ ] 1.2 Create user_event_access table
    - Define table with user_id, event_id, permission columns

    - Add unique constraint on (user_id, event_id)
    - Add foreign keys to user_profiles and events
    - _Requirements: 3.1_

  - [ ] 1.3 Create user_audit_log table
    - Define table with action, target_user_id, performed_by, details, timestamp
    - Add indexes for efficient querying
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 1.4 Create Row Level Security (RLS) policies
    - Policy for user_profiles: super_admin can see all, others see only self
    - Policy for user_event_access: super_admin can see all, others see own entries
    - Policy for events: filter based on user_event_access or super_admin role




    - _Requirements: 5.1, 5.2_

- [ ] 2. Checkpoint - Verify database migration
  - Verify: Migration runs without errors on Supabase
  - Verify: All three tables (user_profiles, user_event_access, user_audit_log) exist with correct columns
  - Verify: RLS policies are active and block unauthorized access (test with anon key)
  - Verify: Foreign key constraints work (cannot insert invalid user_id or event_id)

## Phase 2: Permission Utilities

- [ ] 3. Implement permission utility functions
  - [ ] 3.1 Create permissions.ts with core functions
    - Implement canAccessEvent function
    - Implement canEditEvent function
    - Implement getAccessibleEvents function
    - Implement getRolePermissions function
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 3.3_
  - [ ]* 3.2 Write property test for role validation
    - **Property 1: Role enum validation**
    - **Validates: Requirements 1.1**
  - [x]* 3.3 Write property test for super admin access




    - **Property 2: Super admin full access**
    - **Validates: Requirements 1.2**
  - [x]* 3.4 Write property test for event admin restricted access

    - **Property 3: Event admin restricted access**
    - **Validates: Requirements 1.3**
  - [x]* 3.5 Write property test for view-only access

    - **Property 4: Event viewer read-only access**
    - **Validates: Requirements 1.4, 3.2**

## Phase 3: Permission Context

- [ ] 4. Create PermissionContext for React
  - [ ] 4.1 Implement PermissionContext.tsx
    - Create context with currentUser, hasEventAccess, canEditEvent, isSuperAdmin




    - Fetch user profile and event access on mount
    - Handle loading and error states
    - _Requirements: 3.5, 5.3_
  - [ ] 4.2 Create PermissionProvider component
    - Wrap app with permission context

    - Auto-fetch permissions on auth state change
    - _Requirements: 5.3_
  - [ ] 4.3 Create usePermission hook
    - Provide easy access to permission context

    - Include helper methods for common checks
    - _Requirements: 5.3, 5.4_

- [ ] 5. Checkpoint - Verify permission context
  - Verify: All property tests for permissions pass (Properties 1-4)
  - Verify: PermissionContext correctly fetches user profile on auth state change
  - Verify: usePermissions hook returns correct values for different user roles
  - Verify: Loading and error states display appropriately in UI

## Phase 4: User Data Layer

- [ ] 6. Implement user management data layer
  - [ ] 6.1 Add user management functions to supabaseDataLayer.ts
    - Implement getUserProfiles function
    - Implement getUserProfile function
    - Implement createUserProfile function
    - Implement updateUserProfile function




    - Implement deactivateUser function
    - _Requirements: 2.1, 4.1, 4.4, 4.5_
  - [ ] 6.2 Add event access management functions
    - Implement getUserEventAccess function

    - Implement grantEventAccess function
    - Implement revokeEventAccess function
    - _Requirements: 3.1, 3.4_
  - [ ] 6.3 Add audit log functions
    - Implement createAuditLog function

    - Implement getAuditLogs function
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 6.4 Write property test for user creation validation
    - **Property 5: User creation validation**

    - **Validates: Requirements 2.1**
  - [ ]* 6.5 Write property test for duplicate email prevention
    - **Property 6: Duplicate email prevention**
    - **Validates: Requirements 2.4**
  - [ ]* 6.6 Write property test for audit log creation
    - **Property 16: Audit log creation**
    - **Validates: Requirements 7.1, 7.2, 7.3**

## Phase 5: User Management UI

- [x] 7. Create User Management component





  - [ ] 7.1 Create UserManagement.tsx main component
    - Display list of all users with search/filter
    - Show user email, name, role, event count, last login

    - Add create user button (opens dialog)
    - Add edit/deactivate actions per user
    - _Requirements: 4.1, 4.2_

  - [ ] 7.2 Create CreateUserDialog.tsx
    - Form with email, name, role fields
    - Validation for required fields
    - Submit to create user and send invitation
    - _Requirements: 2.1, 2.2_
  - [ ] 7.3 Create EditUserDialog.tsx
    - Form to edit user name and role
    - Show current event assignments
    - Button to manage event access
    - _Requirements: 4.4_
  - [ ] 7.4 Create UserEventAccessDialog.tsx
    - List all events with checkboxes
    - Permission level selector (view/edit) per event
    - Save button to update access
    - _Requirements: 3.1, 4.3_
  - [ ]* 7.5 Write property test for user list completeness
    - **Property 11: User list completeness**
    - **Validates: Requirements 4.2**

- [ ] 8. Checkpoint - Verify user management UI
  - Verify: Property tests for user management pass (Properties 5, 6, 11, 16)
  - Verify: User list displays all users with correct data (email, name, role, last login)
  - Verify: Create user dialog validates required fields and prevents duplicate emails
  - Verify: Edit user dialog correctly updates user profile and event access
  - Verify: Audit logs are created for all user management actions

## Phase 6: Permission Enforcement

- [ ] 9. Integrate permissions into existing components
  - [ ] 9.1 Update AdminDashboard.tsx
    - Add User Management tab (super_admin only)
    - Filter events based on user access
    - Hide/disable features based on role
    - _Requirements: 5.3_
  - [ ] 9.2 Update EventSelection.tsx
    - Filter event list based on user_event_access
    - Show only accessible events for non-super-admin
    - _Requirements: 3.5_
  - [ ] 9.3 Add permission checks to data modification components
    - ParticipantManagement: check canEditEvent before edit/delete
    - AgendaManagement: check canEditEvent before edit/delete
    - EmailCenter: check canEditEvent before sending
    - BrandingSettings: check canEditEvent before save
    - _Requirements: 5.4_
  - [ ]* 9.4 Write property test for API authorization
    - **Property 13: API authorization enforcement**
    - **Validates: Requirements 5.2**
  - [ ]* 9.5 Write property test for view-only modification prevention
    - **Property 14: View-only modification prevention**
    - **Validates: Requirements 5.4**

## Phase 7: Super Admin Setup

- [ ] 10. Implement Super Admin identification
  - [ ] 10.1 Create first user super admin logic
    - Check if any super_admin exists on registration
    - Auto-assign super_admin role to first user
    - _Requirements: 6.1_
  - [ ] 10.2 Add super admin email configuration
    - Environment variable for super admin emails
    - Auto-assign super_admin on matching email registration
    - _Requirements: 6.2_
  - [ ] 10.3 Add last super admin protection
    - Check super_admin count before role change
    - Prevent demotion if last super_admin
    - _Requirements: 6.4_
  - [ ]* 10.4 Write property test for last super admin protection
    - **Property 15: Last super admin protection**
    - **Validates: Requirements 6.4**

## Phase 8: Audit Logs UI

- [ ] 11. Create Audit Logs viewer
  - [ ] 11.1 Create AuditLogViewer.tsx component
    - Display chronological list of audit entries
    - Show action type, target user, performer, timestamp
    - Filter by action type and date range
    - _Requirements: 7.4_
  - [ ]* 11.2 Write property test for audit log ordering
    - **Property 17: Audit log chronological order**
    - **Validates: Requirements 7.4**

- [ ] 12. Final Checkpoint - Complete integration testing
  - Verify: All property tests pass (Properties 1-17)
  - Verify: Super admin can access all events and manage all users
  - Verify: Event admin can only access assigned events with edit permission
  - Verify: Event viewer can only view assigned events (no edit/delete buttons visible)
  - Verify: Last super admin cannot be demoted or deactivated
  - Verify: Audit log viewer shows all actions in chronological order with filters working
