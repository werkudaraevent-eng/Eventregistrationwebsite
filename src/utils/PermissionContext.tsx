/**
 * Permission Context for Role-Based Access Control (RBAC)
 * 
 * Provides permission checking throughout the React application.
 * Fetches user profile and event access on mount and auth state changes.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './supabase/client';
import {
  UserProfile,
  UserEventAccess,
  UserRole,
  Permission,
  canAccessEvent,
  canEditEvent,
  canCheckInEvent,
  canManageUsers,
  canViewAuditLogs,
  canCreateEvents,
  canDeleteEvents,
  getAccessibleEvents,
  isSuperAdmin,
  getRolePermissions,
} from './permissions';

// ============================================
// CONTEXT TYPES
// ============================================

interface PermissionContextValue {
  // User data
  currentUser: UserProfile | null;
  eventAccess: UserEventAccess[];
  isLoading: boolean;
  error: string | null;
  
  // Permission checks
  hasEventAccess: (eventId: string) => boolean;
  canEditEvent: (eventId: string) => boolean;
  canCheckInEvent: (eventId: string) => boolean;
  isSuperAdmin: () => boolean;
  canManageUsers: () => boolean;
  canViewAuditLogs: () => boolean;
  canCreateEvents: () => boolean;
  canDeleteEvents: () => boolean;
  
  // Event filtering
  filterAccessibleEvents: <T extends { id: string }>(events: T[]) => T[];
  getEventPermission: (eventId: string) => Permission | 'full' | null;
  
  // Actions
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [eventAccess, setEventAccess] = useState<UserEventAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile and event access
  const fetchPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setCurrentUser(null);
        setEventAccess([]);
        return;
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // Profile not found - deny access for security
        // Users must have a valid profile in user_profiles table
        console.error('User profile not found:', profileError.message);
        setError('User profile not found. Please contact an administrator to set up your account.');
        setCurrentUser(null);
        setEventAccess([]);
        return;
      }

      setCurrentUser(profile as UserProfile);

      // Fetch event access (only for non-super-admins, super admins have access to all)
      if (profile.role !== 'super_admin') {
        const { data: access, error: accessError } = await supabase
          .from('user_event_access')
          .select('*')
          .eq('user_id', user.id);

        if (accessError) throw accessError;
        setEventAccess((access || []) as UserEventAccess[]);
      } else {
        // Super admins don't need event access records
        setEventAccess([]);
      }

      // Update last login
      const { error: loginUpdateError } = await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);
      
      if (loginUpdateError) {
        console.warn('Failed to update last_login_at:', loginUpdateError.message);
      }

    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      setError(err.message || 'Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    fetchPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchPermissions();
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setEventAccess([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPermissions]);

  // Permission check functions
  const hasEventAccessFn = useCallback(
    (eventId: string) => canAccessEvent(currentUser, eventAccess, eventId),
    [currentUser, eventAccess]
  );

  const canEditEventFn = useCallback(
    (eventId: string) => canEditEvent(currentUser, eventAccess, eventId),
    [currentUser, eventAccess]
  );

  const canCheckInEventFn = useCallback(
    (eventId: string) => canCheckInEvent(currentUser, eventAccess, eventId),
    [currentUser, eventAccess]
  );

  const isSuperAdminFn = useCallback(
    () => isSuperAdmin(currentUser),
    [currentUser]
  );

  const canManageUsersFn = useCallback(
    () => canManageUsers(currentUser),
    [currentUser]
  );

  const canViewAuditLogsFn = useCallback(
    () => canViewAuditLogs(currentUser),
    [currentUser]
  );

  const canCreateEventsFn = useCallback(
    () => canCreateEvents(currentUser),
    [currentUser]
  );

  const canDeleteEventsFn = useCallback(
    () => canDeleteEvents(currentUser),
    [currentUser]
  );

  const filterAccessibleEventsFn = useCallback(
    <T extends { id: string }>(events: T[]) => 
      getAccessibleEvents(currentUser, eventAccess, events),
    [currentUser, eventAccess]
  );

  const getEventPermissionFn = useCallback(
    (eventId: string): Permission | 'full' | null => {
      if (!currentUser || !currentUser.is_active) return null;
      if (currentUser.role === 'super_admin') return 'full';
      
      const access = eventAccess.find(
        a => a.event_id === eventId && a.user_id === currentUser.id
      );
      return access?.permission || null;
    },
    [currentUser, eventAccess]
  );

  const value: PermissionContextValue = {
    currentUser,
    eventAccess,
    isLoading,
    error,
    hasEventAccess: hasEventAccessFn,
    canEditEvent: canEditEventFn,
    canCheckInEvent: canCheckInEventFn,
    isSuperAdmin: isSuperAdminFn,
    canManageUsers: canManageUsersFn,
    canViewAuditLogs: canViewAuditLogsFn,
    canCreateEvents: canCreateEventsFn,
    canDeleteEvents: canDeleteEventsFn,
    filterAccessibleEvents: filterAccessibleEventsFn,
    getEventPermission: getEventPermissionFn,
    refreshPermissions: fetchPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to access permission context
 */
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  
  return context;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: UserRole): boolean {
  const { currentUser } = usePermissions();
  return currentUser?.role === role && currentUser?.is_active === true;
}

/**
 * Hook to get current user's role permissions
 */
export function useRolePermissions() {
  const { currentUser } = usePermissions();
  
  if (!currentUser || !currentUser.is_active) {
    return null;
  }
  
  return getRolePermissions(currentUser.role);
}

export { PermissionContext };
