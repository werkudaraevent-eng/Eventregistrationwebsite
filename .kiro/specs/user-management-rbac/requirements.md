# Requirements Document

## Introduction

This document defines the requirements for implementing a User Management and Role-Based Access Control (RBAC) system for the Event Registration Website. The system enables the Super Admin to create user accounts, assign roles, and control access to specific events with granular permissions (view-only or edit access).

## Glossary

- **System**: The Event Registration Website application
- **Super Admin**: The primary administrator with full system access
- **User**: Any authenticated person who can access the admin interface
- **Role**: A predefined set of permissions assigned to a user
- **Event Access**: Permission granted to a user for a specific event
- **Permission Level**: The type of access (view or edit) a user has for an event
- **User Profile**: Extended user information stored alongside Supabase Auth data
- **RLS**: Row Level Security - Supabase feature for data access control

## Requirements

### Requirement 1: User Role Management

**User Story:** As a Super Admin, I want to define different user roles, so that I can control what actions different users can perform in the system.

#### Acceptance Criteria

1. THE System SHALL support four distinct roles: super_admin, event_admin, event_viewer, and checkin_operator
2. WHEN a user with super_admin role logs in THEN the System SHALL grant access to all events and all system features
3. WHEN a user with event_admin role logs in THEN the System SHALL grant edit access only to assigned events
4. WHEN a user with event_viewer role logs in THEN the System SHALL grant read-only access only to assigned events
5. WHEN a user with checkin_operator role logs in THEN the System SHALL grant access only to check-in functionality for assigned events

### Requirement 2: User Account Creation

**User Story:** As a Super Admin, I want to create new user accounts, so that I can grant system access to team members and stakeholders.

#### Acceptance Criteria

1. WHEN a Super Admin creates a new user THEN the System SHALL require email address and role selection
2. WHEN a new user is created THEN the System SHALL send an invitation email with a secure link to set password
3. WHEN a user clicks the invitation link THEN the System SHALL allow the user to set their password and complete registration
4. IF a Super Admin attempts to create a user with an existing email THEN the System SHALL display an error message and prevent duplicate creation
5. WHEN a user account is created THEN the System SHALL store the user profile with created_at timestamp and created_by reference

### Requirement 3: Event Access Assignment

**User Story:** As a Super Admin, I want to assign specific events to users, so that users can only access the events they are responsible for.

#### Acceptance Criteria

1. WHEN a Super Admin assigns an event to a user THEN the System SHALL require selection of permission level (view or edit)
2. WHEN a user has view permission for an event THEN the System SHALL allow reading all event data without modification capability
3. WHEN a user has edit permission for an event THEN the System SHALL allow reading and modifying event data including participants, agenda, and settings
4. WHEN a Super Admin removes event access from a user THEN the System SHALL immediately revoke the user's ability to access that event
5. WHEN a user logs in THEN the System SHALL display only the events the user has been granted access to

### Requirement 4: User Management Interface

**User Story:** As a Super Admin, I want a dedicated interface to manage users, so that I can efficiently handle user accounts and permissions.

#### Acceptance Criteria

1. WHEN a Super Admin navigates to User Management THEN the System SHALL display a list of all users with their roles and status
2. WHEN viewing the user list THEN the System SHALL show user email, name, role, number of assigned events, and last login time
3. WHEN a Super Admin clicks on a user THEN the System SHALL display a detail view with all assigned events and their permission levels
4. WHEN a Super Admin edits a user THEN the System SHALL allow changing the user's role and event assignments
5. WHEN a Super Admin deactivates a user THEN the System SHALL prevent the user from logging in while preserving their data

### Requirement 5: Permission Enforcement

**User Story:** As a system administrator, I want permissions to be enforced at both frontend and database levels, so that unauthorized access is prevented even if the UI is bypassed.

#### Acceptance Criteria

1. THE System SHALL implement Row Level Security (RLS) policies in Supabase to enforce event access at the database level
2. WHEN a user without proper permission attempts to access an event via API THEN the System SHALL return an authorization error
3. WHEN rendering the admin interface THEN the System SHALL hide or disable features based on the user's role and permissions
4. WHEN a user with view-only permission attempts to modify data THEN the System SHALL prevent the action and display an appropriate message
5. THE System SHALL validate user permissions on every data modification request before executing the operation

### Requirement 6: Super Admin Identification

**User Story:** As the system owner, I want to be automatically recognized as Super Admin, so that I always have full system access.

#### Acceptance Criteria

1. WHEN the first user registers in the system THEN the System SHALL automatically assign the super_admin role
2. THE System SHALL allow configuration of Super Admin email addresses that are automatically granted super_admin role upon registration
3. WHEN a Super Admin creates another Super Admin THEN the System SHALL require confirmation before granting full system access
4. THE System SHALL prevent the last Super Admin from being demoted or deactivated

### Requirement 7: Audit Trail

**User Story:** As a Super Admin, I want to track user management activities, so that I can monitor who made changes and when.

#### Acceptance Criteria

1. WHEN a user account is created THEN the System SHALL log the action with timestamp and creator information
2. WHEN event access is granted or revoked THEN the System SHALL log the change with timestamp and the admin who made the change
3. WHEN a user's role is changed THEN the System SHALL log the previous role, new role, timestamp, and admin who made the change
4. WHEN a Super Admin views audit logs THEN the System SHALL display a chronological list of user management activities
