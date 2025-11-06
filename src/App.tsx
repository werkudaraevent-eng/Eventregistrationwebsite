import { useState, useEffect } from 'react';
import { DedicatedAdminLogin } from './components/DedicatedAdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { EventSelection } from './components/EventSelection';
import { StandaloneCheckInPage } from './components/StandaloneCheckInPage';
import { PublicRegistrationForm } from './components/PublicRegistrationForm';
import { BadgeDesigner } from './components/BadgeDesigner';
import { supabase } from './utils/supabase/client';
import * as localDB from './utils/localStorage';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [checkInAgendaId, setCheckInAgendaId] = useState<string | null>(null);
  const [registrationEventId, setRegistrationEventId] = useState<string | null>(null);
  const [designerEventId, setDesignerEventId] = useState<string | null>(null);

  useEffect(() => {
    // Run data migration on app load
    localDB.migrateToMultiEventStructure();
    
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

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setAccessToken(session.access_token);
          
          // Check if there's a previously selected event
          const savedEventId = localDB.getSelectedEventId();
          if (savedEventId) {
            const event = localDB.getEventById(savedEventId);
            if (event) {
              setSelectedEventId(savedEventId);
            }
          }
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

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAuthenticated = (token: string) => {
    setAccessToken(token);
  };

  const handleLogout = () => {
    setAccessToken(null);
    setSelectedEventId(null);
    localDB.clearSelectedEvent();
  };

  const handleEventSelected = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleBackToEvents = () => {
    setSelectedEventId(null);
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
          url.searchParams.delete('designer');
          window.location.replace(url.origin + url.pathname);
        }}
      />
    );
  }

  // If admin is authenticated, show appropriate dashboard
  if (accessToken) {
    // If event is selected, show event dashboard
    if (selectedEventId) {
      return (
        <AdminDashboard 
          eventId={selectedEventId}
          accessToken={accessToken} 
          onLogout={handleLogout}
          onBackToEvents={handleBackToEvents}
        />
      );
    }
    
    // Otherwise show event selection
    return (
      <EventSelection 
        onEventSelected={handleEventSelected}
        onLogout={handleLogout}
      />
    );
  }

  // Default landing page: Show Admin Login
  // Public registration is ONLY accessible via specific event URLs (#/register/[eventId])
  return (
    <DedicatedAdminLogin 
      onAuthenticated={handleAuthenticated}
    />
  );
}
