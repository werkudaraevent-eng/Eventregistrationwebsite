import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ParticipantManagement } from './ParticipantManagement';
import { AgendaManagement } from './AgendaManagement';
import { BrandingSettings } from './BrandingSettingsNew';
import { EmailTemplates } from './EmailTemplates';
import BlastCampaigns from './BlastCampaigns';
import { EmailConfigurationV2 } from './EmailConfigurationV2';
import { EmailHistory } from './EmailHistory';
import SeatingManagement from './SeatingManagement';
import { UserManagement } from './UserManagement';
import { LogOut, Users, Calendar, ArrowLeft, Palette, Mail, Send, Settings, History, CreditCard, LayoutGrid, Shield } from 'lucide-react';
import { supabase, isAuthError, handleAuthError } from '../utils/supabase/client';
import { BadgeDesigner } from './BadgeDesigner';
import { usePermissions } from '../utils/PermissionContext';

interface AdminDashboardProps {
  eventId: string;
  accessToken: string;
  onLogout: () => void;
  onBackToEvents: () => void;
}

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  createdAt: string;
}

export function AdminDashboard({ eventId, accessToken, onLogout, onBackToEvents }: AdminDashboardProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<string>('participants');
  const { canManageUsers } = usePermissions();

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const validTabs = ['participants', 'agenda', 'branding', 'badge-design', 'seating', 'emails', 'blast', 'email-config', 'email-history'];
    // Only allow 'users' tab if user has permission
    if (canManageUsers()) {
      validTabs.push('users');
    }
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [canManageUsers]);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error) {
          // Check for auth error and attempt recovery
          if (isAuthError(error)) {
            console.warn('[AdminDashboard] Auth error detected, attempting recovery...');
            const recovered = await handleAuthError();
            if (!recovered) {
              // Session expired - trigger logout
              onLogout();
              return;
            }
            // Retry after recovery
            loadEvent();
            return;
          }
          console.error('Error loading event:', error);
        } else {
          setEvent(data);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId, onLogout]);

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    // Save tab to URL
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabValue);
    window.history.pushState({}, '', url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleBackToEvents = () => {
    onBackToEvents();
  };

  const navItems = [
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'badge-design', label: 'Badge', icon: CreditCard },
    { id: 'seating', label: 'Seating', icon: LayoutGrid },
    { id: 'emails', label: 'Templates', icon: Mail },
    { id: 'blast', label: 'Blast', icon: Send },
    { id: 'email-config', label: 'Settings', icon: Settings },
    { id: 'email-history', label: 'History', icon: History },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'participants':
        return <ParticipantManagement eventId={eventId} accessToken={accessToken} />;
      case 'agenda':
        return <AgendaManagement eventId={eventId} accessToken={accessToken} />;
      case 'branding':
        return <BrandingSettings eventId={eventId} />;
      case 'badge-design':
        return <BadgeDesigner eventId={eventId} />;
      case 'seating':
        return <SeatingManagement eventId={eventId} />;
      case 'emails':
        return <EmailTemplates eventId={eventId} />;
      case 'blast':
        return <BlastCampaigns eventId={eventId} />;
      case 'email-config':
        return <EmailConfigurationV2 />;
      case 'email-history':
        return <EmailHistory eventId={eventId} />;
      case 'users':
        return canManageUsers() ? <UserManagement /> : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">You don't have permission to access this section.</p>
          </div>
        );
      default:
        return <ParticipantManagement eventId={eventId} accessToken={accessToken} />;
    }
  };

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <Button 
            onClick={handleBackToEvents} 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-gray-600 hover:bg-gray-100 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
          <div className="px-2">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {event?.name || 'Event Dashboard'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage your event
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
            {canManageUsers() && (
              <li>
                <button
                  onClick={() => handleTabChange('users')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Shield className={`h-5 w-5 ${activeTab === 'users' ? 'text-primary-600' : 'text-gray-400'}`} />
                  Users
                </button>
              </li>
            )}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full justify-start text-gray-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-gray-100">
        <div className="p-6 min-h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
