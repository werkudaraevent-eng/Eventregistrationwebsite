import { createClient, AuthError } from '@supabase/supabase-js';

// @ts-ignore - Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

// Create a single shared Supabase client instance with auto-refresh enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Check if an error is an authentication error (401/403 or session expired)
 */
export function isAuthError(error: unknown): boolean {
  if (!error) return false;
  
  // Check for Supabase AuthError
  if (error instanceof AuthError) return true;
  
  // Check for error object with code/status
  const err = error as { code?: string; status?: number; message?: string };
  
  // HTTP status codes
  if (err.status === 401 || err.status === 403) return true;
  
  // Supabase error codes
  if (err.code === 'PGRST301' || err.code === '401' || err.code === '403') return true;
  
  // Check error message
  const message = err.message?.toLowerCase() || '';
  if (
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('not authenticated') ||
    message.includes('session expired') ||
    message.includes('refresh_token_not_found')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Force refresh the session token
 * Returns true if successful, false if user needs to re-login
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.warn('[Auth] Session refresh failed:', error?.message);
      return false;
    }
    console.log('[Auth] Session refreshed successfully');
    return true;
  } catch (err) {
    console.error('[Auth] Error refreshing session:', err);
    return false;
  }
}

/**
 * Check if user has a valid session
 */
export async function hasValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return false;
    
    // Check if token is about to expire (within 5 minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
      if (expiresIn < 300) {
        // Token expiring soon, try to refresh
        return await refreshSession();
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle auth error - attempt refresh, return false if user needs to re-login
 */
export async function handleAuthError(): Promise<boolean> {
  const refreshed = await refreshSession();
  if (!refreshed) {
    // Clear session and trigger re-login
    await supabase.auth.signOut();
    return false;
  }
  return true;
}

// Set up visibility change listener to refresh token when tab becomes active
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      // Tab became active - check and refresh session if needed
      const isValid = await hasValidSession();
      if (!isValid) {
        console.log('[Auth] Session invalid after tab activation, attempting refresh...');
        const refreshed = await refreshSession();
        if (!refreshed) {
          // Dispatch custom event for app to handle
          window.dispatchEvent(new CustomEvent('supabase:session-expired'));
        }
      }
    }
  });
}
