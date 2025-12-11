/**
 * Permission Utilities for Role-Based Access Control (RBAC)
 * 
 * This module provides utility functions for checking user permissions
 * and access rights throughout the application.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export type UserRole = 'super_admin' | 'event_admin' | 'event_viewer' | 'checkin_operator';
export type Permission = 'view' | 'edit';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface UserEventAccess {
  id: string;
  user_id: string;
  event_id: string;
  permission: Permission;
  created_at: string;
  granted_by: string | null;
}

export interface RolePermissions {
  canViewAllEvents: boolean;
  canCreateEvents: boolean;
  canDeleteEvents: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canEditAssignedEvents: boolean;
  canViewAssignedEvents: boolean;
  canCheckInParticipants: boolean;
}

// ============================================
// ROLE PERMISSIONS MATRIX
// ============================================

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    canViewAllEvents: true,
    canCreateEvents: true,
    canDeleteEvents: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canEditAssignedEvents: true,
    canViewAssignedEvents: true,
    canCheckInParticipants: true,
  },
  event_admin: {
    canViewAllEvents: false,
    canCreateEvents: false,
    canDeleteEvents: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canEditAssignedEvents: true,
    canViewAssignedEvents: true,
    canCheckInParticipants: true,
  },
  event_viewer: {
    canViewAllEvents: false,
    canCreateEvents: false,
    canDeleteEvents: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canEditAssignedEvents: false,
    canViewAssignedEvents: true,
    canCheckInParticipants: false,
  },
  checkin_operator: {
    canViewAllEvents: false,
    canCreateEvents: false,
    canDeleteEvents: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canEditAssignedEvents: false,
    canViewAssignedEvents: true,
    canCheckInParticipants: true,
  },
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates if a string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return ['super_admin', 'event_admin', 'event_viewer', 'checkin_operator'].includes(role);
}

/**
 * Validates if a string is a valid Permission
 */
export function isValidPermission(permission: string): permission is Permission {
  return ['view', 'edit'].includes(permission);
}

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

/**
 * Gets the permissions for a specific role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Checks if a user is a super admin
 */
export function isSuperAdmin(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false;
  return userProfile.role === 'super_admin' && userProfile.is_active;
}

/**
 * Checks if a user has access to a specific event
 */
export function canAccessEvent(
  userProfile: UserProfile | null,
  eventAccess: UserEventAccess[],
  eventId: string
): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  
  // Super admins have access to all events
  if (userProfile.role === 'super_admin') return true;
  
  // Check if user has any access to this event
  return eventAccess.some(
    access => access.event_id === eventId && access.user_id === userProfile.id
  );
}

/**
 * Checks if a user can edit a specific event
 */
export function canEditEvent(
  userProfile: UserProfile | null,
  eventAccess: UserEventAccess[],
  eventId: string
): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  
  // Super admins can edit all events
  if (userProfile.role === 'super_admin') return true;
  
  // Event viewers cannot edit
  if (userProfile.role === 'event_viewer') return false;
  
  // Check if user has edit permission for this event
  const access = eventAccess.find(
    a => a.event_id === eventId && a.user_id === userProfile.id
  );
  
  return access?.permission === 'edit';
}

/**
 * Checks if a user can check-in participants for a specific event
 */
export function canCheckInEvent(
  userProfile: UserProfile | null,
  eventAccess: UserEventAccess[],
  eventId: string
): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  
  // Super admins can check-in for all events
  if (userProfile.role === 'super_admin') return true;
  
  // Event viewers cannot check-in
  if (userProfile.role === 'event_viewer') return false;
  
  // Check if user has access to this event
  return eventAccess.some(
    access => access.event_id === eventId && access.user_id === userProfile.id
  );
}

/**
 * Gets the permission level for a user on a specific event
 */
export function getEventPermission(
  userProfile: UserProfile | null,
  eventAccess: UserEventAccess[],
  eventId: string
): Permission | 'full' | null {
  if (!userProfile || !userProfile.is_active) return null;
  
  // Super admins have full access
  if (userProfile.role === 'super_admin') return 'full';
  
  // Find the access record
  const access = eventAccess.find(
    a => a.event_id === eventId && a.user_id === userProfile.id
  );
  
  return access?.permission || null;
}

/**
 * Filters events to only those the user can access
 */
export function getAccessibleEvents<T extends { id: string }>(
  userProfile: UserProfile | null,
  eventAccess: UserEventAccess[],
  allEvents: T[]
): T[] {
  if (!userProfile || !userProfile.is_active) return [];
  
  // Super admins can access all events
  if (userProfile.role === 'super_admin') return allEvents;
  
  // Filter to only accessible events
  const accessibleEventIds = new Set(
    eventAccess
      .filter(a => a.user_id === userProfile.id)
      .map(a => a.event_id)
  );
  
  return allEvents.filter(event => accessibleEventIds.has(event.id));
}

/**
 * Gets events with their permission levels for a user
 */
export function getEventsWithPermissions<T extends { id: string }>(
  userProfile: UserProfile | null,
  eventAccess: UserEventAccess[],
  allEvents: T[]
): Array<T & { permission: Permission | 'full' }> {
  if (!userProfile || !userProfile.is_active) return [];
  
  // Super admins get all events with full permission
  if (userProfile.role === 'super_admin') {
    return allEvents.map(event => ({ ...event, permission: 'full' as const }));
  }
  
  // Map events with their permissions
  const accessMap = new Map(
    eventAccess
      .filter(a => a.user_id === userProfile.id)
      .map(a => [a.event_id, a.permission])
  );
  
  return allEvents
    .filter(event => accessMap.has(event.id))
    .map(event => ({
      ...event,
      permission: accessMap.get(event.id)!
    }));
}

// ============================================
// ROLE-BASED FEATURE CHECKS
// ============================================

/**
 * Checks if user can manage other users
 */
export function canManageUsers(userProfile: UserProfile | null): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  return getRolePermissions(userProfile.role).canManageUsers;
}

/**
 * Checks if user can view audit logs
 */
export function canViewAuditLogs(userProfile: UserProfile | null): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  return getRolePermissions(userProfile.role).canViewAuditLogs;
}

/**
 * Checks if user can create new events
 */
export function canCreateEvents(userProfile: UserProfile | null): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  return getRolePermissions(userProfile.role).canCreateEvents;
}

/**
 * Checks if user can delete events
 */
export function canDeleteEvents(userProfile: UserProfile | null): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  return getRolePermissions(userProfile.role).canDeleteEvents;
}

/**
 * Gets a human-readable label for a role
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    event_admin: 'Event Admin',
    event_viewer: 'Event Viewer',
    checkin_operator: 'Check-in Operator',
  };
  return labels[role];
}

/**
 * Gets a description for a role
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    super_admin: 'Full access to all events and system settings',
    event_admin: 'Can edit assigned events and manage participants',
    event_viewer: 'Can view assigned events (read-only)',
    checkin_operator: 'Can check-in participants for assigned events',
  };
  return descriptions[role];
}

/**
 * Gets a human-readable label for a permission
 */
export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    view: 'View Only',
    edit: 'Edit',
  };
  return labels[permission];
}
