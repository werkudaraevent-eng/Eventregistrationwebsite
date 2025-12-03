import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ParticipantManagement } from './ParticipantManagement';
import { AgendaManagement } from './AgendaManagement';
import { BrandingSettings } from './BrandingSettingsNew';
import { EmailTemplates } from './EmailTemplates';
import BlastCampaigns from './BlastCampaigns';
import { EmailConfigurationV2 } from './EmailConfigurationV2';
import { EmailHistory } from './EmailHistory';
import { LogOut, Users, Calendar, ArrowLeft, Palette, Mail, Send, Settings, History, CreditCard } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { BadgeDesigner } from './BadgeDesigner';

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

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['participants', 'agenda', 'branding', 'badge-design', 'emails', 'blast', 'email-config', 'email-history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error) {
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
  }, [eventId]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackToEvents} variant="ghost" size="sm" className="hover:bg-purple-100 hover:text-purple-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{event?.name || 'Event Management Dashboard'}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage registrations, attendance, and event schedule
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-gray-300 hover:border-gray-400">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <TabsList className="flex w-full max-w-5xl mx-auto gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-md border border-gray-200 h-14">
            <TabsTrigger value="participants" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Participants</span>
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="badge-design" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Badge Design</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="blast" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Blast</span>
            </TabsTrigger>
            <TabsTrigger value="email-config" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Email Settings</span>
            </TabsTrigger>
            <TabsTrigger value="email-history" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Email History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <ParticipantManagement eventId={eventId} accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="agenda">
            <AgendaManagement eventId={eventId} accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings eventId={eventId} />
          </TabsContent>

          <TabsContent value="badge-design">
            <BadgeDesigner eventId={eventId} />
          </TabsContent>

          <TabsContent value="emails">
            <EmailTemplates eventId={eventId} />
          </TabsContent>

          <TabsContent value="blast">
            <BlastCampaigns eventId={eventId} />
          </TabsContent>

          <TabsContent value="email-config">
            <EmailConfigurationV2 />
          </TabsContent>

          <TabsContent value="email-history">
            <EmailHistory eventId={eventId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
