/**
 * User Management Data Layer
 * 
 * This module provides data access functions for user management,
 * including user profiles, event access, and audit logging.
 */

import { supabase } from './supabase/client';
import type { UserProfile, UserEventAccess, UserRole, Permission } from './permissions';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UserAuditLog {
  id: string;
  action: AuditAction;
  target_user_id: string | null;
  performed_by: string | null;
  details: Record<string, any>;
  created_at: string;
}

export type AuditAction = 
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'role_changed'
  | 'access_granted'
  | 'access_revoked'
  | 'login_success'
  | 'login_failed';

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface GrantAccessInput {
  user_id: string;
  event_id: string;
  permission: Permission;
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

/**
 * Get all user profiles (super admin only)
 */
export async function getUserProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch user profiles: ${error.message}`);
  return data as UserProfile[];
}

/**
 * Get a single user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
  return data as UserProfile;
}

/**
 * Get user profile by email
 */
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
  return data as UserProfile;
}

/**
 * Create a new user via Supabase Auth invitation
 * Note: This sends an invitation email to the user
 */
export async function inviteUser(
  input: CreateUserInput,
  performedBy: string
): Promise<{ user: UserProfile; inviteSent: boolean }> {
  // Check if email already exists
  const existing = await getUserProfileByEmail(input.email);
  if (existing) {
    throw new Error('A user with this email already exists');
  }

  // Invite user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: {
        name: input.name,
        role: input.role,
      },
    }
  );

  if (authError) {
    throw new Error(`Failed to invite user: ${authError.message}`);
  }

  // Poll for profile creation by trigger (max 3 seconds with 100ms intervals)
  let profile: UserProfile | null = null;
  const maxRetries = 30;
  for (let i = 0; i < maxRetries && !profile; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    profile = await getUserProfile(authData.user.id);
  }

  if (!profile) {
    throw new Error('Timeout waiting for user profile creation');
  }

  // Update the profile with the correct role (trigger sets default)
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ 
      role: input.role,
      name: input.name,
      created_by: performedBy 
    })
    .eq('id', authData.user.id);

  if (updateError) {
    throw new Error(`Failed to update user role: ${updateError.message}`);
  }

  // Refetch to get updated profile
  profile = await getUserProfile(authData.user.id);
  if (!profile) {
    throw new Error('User profile was not created');
  }

  // Log the action
  await createAuditLog({
    action: 'user_created',
    target_user_id: profile.id,
    performed_by: performedBy,
    details: {
      email: input.email,
      name: input.name,
      role: input.role,
    },
  });

  return { user: profile, inviteSent: true };
}

/**
 * Create user profile directly (for existing auth users)
 */
export async function createUserProfile(
  userId: string,
  input: CreateUserInput,
  performedBy?: string
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email: input.email,
      name: input.name,
      role: input.role,
      created_by: performedBy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user profile: ${error.message}`);

  // Log the action
  await createAuditLog({
    action: 'user_created',
    target_user_id: userId,
    performed_by: performedBy || null,
    details: {
      email: input.email,
      name: input.name,
      role: input.role,
    },
  });

  return data as UserProfile;
}

/**
 * Update a user profile
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateUserInput,
  performedBy: string
): Promise<UserProfile> {
  // Get current profile for audit log
  const currentProfile = await getUserProfile(userId);
  if (!currentProfile) {
    throw new Error('User not found');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update(input)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user profile: ${error.message}`);

  // Log role change if applicable
  if (input.role && input.role !== currentProfile.role) {
    await createAuditLog({
      action: 'role_changed',
      target_user_id: userId,
      performed_by: performedBy,
      details: {
        previous_role: currentProfile.role,
        new_role: input.role,
      },
    });
  }

  // Log activation/deactivation
  if (input.is_active !== undefined && input.is_active !== currentProfile.is_active) {
    await createAuditLog({
      action: input.is_active ? 'user_reactivated' : 'user_deactivated',
      target_user_id: userId,
      performed_by: performedBy,
      details: {},
    });
  }

  return data as UserProfile;
}

/**
 * Deactivate a user (soft delete)
 * 
 * Note: Database trigger `protect_last_super_admin` provides atomic protection
 * against deactivating the last super admin (prevents TOCTOU race conditions)
 */
export async function deactivateUser(
  userId: string,
  performedBy: string
): Promise<UserProfile> {
  try {
    return await updateUserProfile(userId, { is_active: false }, performedBy);
  } catch (error) {
    // Handle database trigger error for last super admin protection
    // PostgreSQL RAISE EXCEPTION uses SQLSTATE code P0001 (raise_exception)
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === 'P0001' || (error instanceof Error && error.message.includes('last super admin'))) {
      throw new Error('Cannot deactivate the last super admin');
    }
    throw error;
  }
}

/**
 * Reactivate a user
 */
export async function reactivateUser(
  userId: string,
  performedBy: string
): Promise<UserProfile> {
  return updateUserProfile(userId, { is_active: true }, performedBy);
}

/**
 * Count super admins
 */
export async function countSuperAdmins(): Promise<number> {
  const { count, error } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .eq('is_active', true);

  if (error) throw new Error(`Failed to count super admins: ${error.message}`);
  return count || 0;
}


// ============================================
// EVENT ACCESS FUNCTIONS
// ============================================

/**
 * Get all event access records for a user
 */
export async function getUserEventAccess(userId: string): Promise<UserEventAccess[]> {
  const { data, error } = await supabase
    .from('user_event_access')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch event access: ${error.message}`);
  return data as UserEventAccess[];
}

/**
 * Get all users with access to a specific event
 */
export async function getEventUsers(eventId: string): Promise<Array<UserEventAccess & { user: UserProfile }>> {
  const { data, error } = await supabase
    .from('user_event_access')
    .select(`
      *,
      user:user_profiles(*)
    `)
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to fetch event users: ${error.message}`);
  return data as Array<UserEventAccess & { user: UserProfile }>;
}

/**
 * Grant event access to a user
 */
export async function grantEventAccess(
  input: GrantAccessInput,
  performedBy: string
): Promise<UserEventAccess> {
  // Check if access already exists
  const { data: existing } = await supabase
    .from('user_event_access')
    .select('*')
    .eq('user_id', input.user_id)
    .eq('event_id', input.event_id)
    .single();

  if (existing) {
    // Update existing access
    const { data, error } = await supabase
      .from('user_event_access')
      .update({ permission: input.permission, granted_by: performedBy })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update event access: ${error.message}`);

    await createAuditLog({
      action: 'access_granted',
      target_user_id: input.user_id,
      performed_by: performedBy,
      details: {
        event_id: input.event_id,
        permission: input.permission,
        updated: true,
      },
    });

    return data as UserEventAccess;
  }

  // Create new access
  const { data, error } = await supabase
    .from('user_event_access')
    .insert({
      user_id: input.user_id,
      event_id: input.event_id,
      permission: input.permission,
      granted_by: performedBy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to grant event access: ${error.message}`);

  await createAuditLog({
    action: 'access_granted',
    target_user_id: input.user_id,
    performed_by: performedBy,
    details: {
      event_id: input.event_id,
      permission: input.permission,
    },
  });

  return data as UserEventAccess;
}

/**
 * Revoke event access from a user
 */
export async function revokeEventAccess(
  userId: string,
  eventId: string,
  performedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('user_event_access')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to revoke event access: ${error.message}`);

  await createAuditLog({
    action: 'access_revoked',
    target_user_id: userId,
    performed_by: performedBy,
    details: {
      event_id: eventId,
    },
  });
}

/**
 * Update multiple event access records for a user
 */
export async function updateUserEventAccess(
  userId: string,
  accessList: Array<{ event_id: string; permission: Permission }>,
  performedBy: string
): Promise<void> {
  // Get current access
  const currentAccess = await getUserEventAccess(userId);
  const newEventIds = new Set(accessList.map(a => a.event_id));

  // Revoke access for events not in new list
  for (const access of currentAccess) {
    if (!newEventIds.has(access.event_id)) {
      await revokeEventAccess(userId, access.event_id, performedBy);
    }
  }

  // Grant/update access for events in new list
  for (const access of accessList) {
    await grantEventAccess(
      { user_id: userId, event_id: access.event_id, permission: access.permission },
      performedBy
    );
  }
}

// ============================================
// AUDIT LOG FUNCTIONS
// ============================================

interface CreateAuditLogInput {
  action: AuditAction;
  target_user_id: string | null;
  performed_by: string | null;
  details: Record<string, any>;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<UserAuditLog> {
  const { data, error } = await supabase
    .from('user_audit_log')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break main operations
    return {
      id: '',
      ...input,
      created_at: new Date().toISOString(),
    };
  }

  return data as UserAuditLog;
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(options?: {
  targetUserId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}): Promise<UserAuditLog[]> {
  let query = supabase
    .from('user_audit_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.targetUserId) {
    query = query.eq('target_user_id', options.targetUserId);
  }

  if (options?.action) {
    query = query.eq('action', options.action);
  }

  if (options?.offset) {
    // Use range() for offset-based pagination
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  } else if (options?.limit) {
    // Use limit() only when no offset is provided
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
  return data as UserAuditLog[];
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId: string): Promise<UserAuditLog[]> {
  return getAuditLogs({ targetUserId: userId });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get users with their event access counts
 */
export async function getUsersWithAccessCounts(): Promise<Array<UserProfile & { event_count: number }>> {
  const profiles = await getUserProfiles();
  
  const result = await Promise.all(
    profiles.map(async (profile) => {
      if (profile.role === 'super_admin') {
        // Super admins have access to all events
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });
        return { ...profile, event_count: count || 0 };
      } else {
        const access = await getUserEventAccess(profile.id);
        return { ...profile, event_count: access.length };
      }
    })
  );

  return result;
}

/**
 * Check if a user can be demoted from super_admin
 */
export async function canDemoteSuperAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (profile?.role !== 'super_admin') return true;

  const count = await countSuperAdmins();
  return count > 1;
}
