import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ParticipantManagement } from './ParticipantManagement';
import { AgendaManagement } from './AgendaManagement';
import { AttendanceScanner } from './AttendanceScanner';
import { BrandingSettings } from './BrandingSettings';
import { LogOut, Users, Calendar, ScanLine, ArrowLeft, Palette } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import * as localDB from '../utils/localStorage';

interface AdminDashboardProps {
  eventId: string;
  accessToken: string;
  onLogout: () => void;
  onBackToEvents: () => void;
}

export function AdminDashboard({ eventId, accessToken, onLogout, onBackToEvents }: AdminDashboardProps) {
  const [event, setEvent] = useState<localDB.Event | null>(null);

  useEffect(() => {
    const loadedEvent = localDB.getEventById(eventId);
    setEvent(loadedEvent);
  }, [eventId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localDB.clearSelectedEvent();
    onLogout();
  };

  const handleBackToEvents = () => {
    localDB.clearSelectedEvent();
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
        <Tabs defaultValue="scanner" className="space-y-8">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-4 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-md border border-gray-200 h-14">
            <TabsTrigger value="scanner" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Scanner</span>
            </TabsTrigger>
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
          </TabsList>

          <TabsContent value="scanner">
            <AttendanceScanner eventId={eventId} />
          </TabsContent>

          <TabsContent value="participants">
            <ParticipantManagement eventId={eventId} accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="agenda">
            <AgendaManagement eventId={eventId} accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings eventId={eventId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
