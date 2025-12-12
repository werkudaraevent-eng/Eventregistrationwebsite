import { useState, useEffect } from 'react';
import { DedicatedAdminLogin } from './components/DedicatedAdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { EventSelection } from './components/EventSelection';
import { StandaloneCheckInPage } from './components/StandaloneCheckInPage';
import { PublicRegistrationForm } from './components/PublicRegistrationForm';
import { BadgeDesigner } from './components/BadgeDesigner';
import { Toaster } from './components/ui/sonner';
import { supabase } from './utils/supabase/client';
import { PermissionProvider } from './utils/PermissionContext';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [checkInAgendaId, setCheckInAgendaId] = useState<string | null>(null);
  const [registrationEventId, setRegistrationEventId] = useState<string | null>(null);
  const [designerEventId, setDesignerEventId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Designer route via query
    const designerParam = urlParams.get('designer');
    if (designerParam) {
      setDesignerEventId(designerParam);
      setIsCheckingSession(false);
      return;
    }

    // Designer route via hash (#/designer/eventId)
    const designerHashMatch = hash.match(/^#\/designer\/(.+)$/);
    if (designerHashMatch && designerHashMatch[1]) {
      setDesignerEventId(designerHashMatch[1]);
      setIsCheckingSession(false);
      return;
    } else if (!designerParam) {
      setDesignerEventId(null);
    }
    
    // Check URL for check-in page route (query param)
    const agendaId = urlParams.get('checkin');
    if (agendaId) {
      setCheckInAgendaId(agendaId);
      setIsCheckingSession(false);
      return;
    }
    
    // Check URL for registration page route (query param or hash)
    const registerEventIdParam = urlParams.get('register');
    if (registerEventIdParam) {
      setRegistrationEventId(registerEventIdParam);
      setIsCheckingSession(false);
      return;
    }
    
    // Check hash-based routing for registration (#/register/eventId)
    const registerMatch = hash.match(/^#\/register\/(.+)$/);
    if (registerMatch && registerMatch[1]) {
      setRegistrationEventId(registerMatch[1]);
      setIsCheckingSession(false);
      return;
    }

    // Check URL for selected event (admin dashboard)
    const selectedEventParam = urlParams.get('event');
    if (selectedEventParam) {
      setSelectedEventId(selectedEventParam);
    }

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setAccessToken(session.access_token);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // Listen for hash changes to support client-side routing
    const handleHashChange = () => {
      const hash = window.location.hash;
      const registerMatch = hash.match(/^#\/register\/(.+)$/);
      const designerMatch = hash.match(/^#\/designer\/(.+)$/);
      if (registerMatch && registerMatch[1]) {
        setRegistrationEventId(registerMatch[1]);
        setDesignerEventId(null);
      } else if (designerMatch && designerMatch[1]) {
        setDesignerEventId(designerMatch[1]);
        setRegistrationEventId(null);
        setCheckInAgendaId(null);
      } else if (!hash || hash === '#/' || hash === '#') {
        setRegistrationEventId(null);
        setDesignerEventId(null);
      } else if (!hash || hash === '#/' || hash === '#') {
        setRegistrationEventId(null);
      }
    };

    // Listen for session expired event (from visibility change handler)
    const handleSessionExpired = () => {
      console.log('[App] Session expired, logging out...');
      setAccessToken(null);
      setSelectedEventId(null);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('supabase:session-expired', handleSessionExpired);
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAccessToken(null);
        setSelectedEventId(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          setAccessToken(session.access_token);
        }
      }
    });
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('supabase:session-expired', handleSessionExpired);
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthenticated = (token: string) => {
    setAccessToken(token);
  };

  const handleLogout = () => {
    setAccessToken(null);
    setSelectedEventId(null);
    // Remove event ID from URL on logout
    const url = new URL(window.location.href);
    url.searchParams.delete('event');
    window.history.pushState({}, '', url);
  };

  const handleEventSelected = (eventId: string) => {
    setSelectedEventId(eventId);
    // Add event ID to URL so it persists on refresh
    const url = new URL(window.location.href);
    url.searchParams.set('event', eventId);
    window.history.pushState({}, '', url);
  };

  const handleBackToEvents = () => {
    setSelectedEventId(null);
    // Remove event ID from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('event');
    window.history.pushState({}, '', url);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If this is a check-in page route, show standalone check-in page
  if (checkInAgendaId) {
    return <StandaloneCheckInPage agendaId={checkInAgendaId} />;
  }
  
  // If this is a public registration page route, show public registration form
  if (registrationEventId) {
    return <PublicRegistrationForm eventId={registrationEventId} />;
  }

  // Dedicated badge designer route
  if (designerEventId) {
    return (
      <BadgeDesigner
        eventId={designerEventId}
        onClose={() => {
          const url = new URL(window.location.href);
          const referrer = url.searchParams.get('from');
          
          // If came from check-in page, go back to check-in
          if (referrer && referrer.startsWith('checkin=')) {
            const agendaId = referrer.replace('checkin=', '');
            const redirectUrl = new URL(window.location.origin + window.location.pathname);
            redirectUrl.searchParams.set('checkin', agendaId);
            window.location.replace(redirectUrl.toString());
          } 
          // If came from admin, go back to admin with event parameter
          else if (referrer && referrer.startsWith('admin=')) {
            const redirectUrl = new URL(window.location.origin + window.location.pathname);
            redirectUrl.searchParams.set('event', designerEventId);
            redirectUrl.searchParams.set('tab', 'branding');
            window.location.replace(redirectUrl.toString());
          }
          // Otherwise go to home
          else {
            url.searchParams.delete('designer');
            url.searchParams.delete('from');
            window.location.replace(url.origin + url.pathname);
          }
        }}
      />
    );
  }

  // If admin is authenticated, show appropriate dashboard
  if (accessToken) {
    // If event is selected, show event dashboard
    if (selectedEventId) {
      return (
        <PermissionProvider>
          <AdminDashboard 
            eventId={selectedEventId}
            accessToken={accessToken} 
            onLogout={handleLogout}
            onBackToEvents={handleBackToEvents}
          />
          <Toaster position="top-right" richColors />
        </PermissionProvider>
      );
    }
    
    // Otherwise show event selection
    return (
      <PermissionProvider>
        <EventSelection 
          onEventSelected={handleEventSelected}
          onLogout={handleLogout}
        />
        <Toaster position="top-right" richColors />
      </PermissionProvider>
    );
  }

  // Default landing page: Show Admin Login
  // Public registration is ONLY accessible via specific event URLs (#/register/[eventId])
  return (
    <>
      <DedicatedAdminLogin 
        onAuthenticated={handleAuthenticated}
      />
      <Toaster position="top-right" richColors />
    </>
  );
}
