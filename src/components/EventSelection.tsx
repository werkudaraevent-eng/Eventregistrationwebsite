import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Calendar, MapPin, Edit, Trash2, LogOut, ArrowRight, CalendarDays } from 'lucide-react';
import * as localDB from '../utils/localStorage';
import { supabase } from '../utils/supabase/client';
import { MigrationNotice } from './MigrationNotice';
import { DataMigrationDialog } from './DataMigrationDialog';

type Event = localDB.Event;

interface EventSelectionProps {
  onEventSelected: (eventId: string) => void;
  onLogout: () => void;
}

export function EventSelection({ onEventSelected, onLogout }: EventSelectionProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    const allEvents = localDB.getAllEvents();
    setEvents(allEvents);
  };

  const handleCreateEvent = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    });
    setShowCreateDialog(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      description: event.description,
    });
    setShowEditDialog(true);
  };

  const handleSubmitCreate = () => {
    if (!formData.name || !formData.startDate) {
      alert('Please fill in required fields (Event Name and Start Date)');
      return;
    }

    const newEvent: Event = {
      id: localDB.generateEventId(),
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      location: formData.location,
      description: formData.description,
      createdAt: new Date().toISOString(),
    };

    localDB.saveEvent(newEvent);
    loadEvents();
    setShowCreateDialog(false);
  };

  const handleSubmitEdit = () => {
    if (!editingEvent) return;
    
    if (!formData.name || !formData.startDate) {
      alert('Please fill in required fields (Event Name and Start Date)');
      return;
    }

    localDB.updateEvent(editingEvent.id, {
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      location: formData.location,
      description: formData.description,
    });

    loadEvents();
    setShowEditDialog(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    if (confirm(`Are you sure you want to delete "${eventName}"?\n\nThis will permanently delete all participants, agenda items, and attendance records associated with this event.`)) {
      localDB.deleteEvent(eventId);
      loadEvents();
    }
  };

  const handleSelectEvent = (eventId: string) => {
    localDB.setSelectedEvent(eventId);
    onEventSelected(eventId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Event Management System</h1>
            <p className="text-sm text-gray-600 mt-1">
              Select an event to manage or create a new one
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-gray-300 hover:border-gray-400">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Migration Notice */}
          <div className="mb-8">
            <MigrationNotice onMigrateClick={() => setShowMigrationDialog(true)} />
          </div>
          
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl mb-2">Your Events</h2>
              <p className="text-gray-600 text-lg">
                {events.length} {events.length === 1 ? 'event' : 'events'} total
              </p>
            </div>
            <Button onClick={handleCreateEvent} size="lg" className="gradient-primary hover:opacity-90 shadow-lg shadow-purple-500/30 h-12 px-6">
              <Plus className="mr-2 h-5 w-5" />
              Create New Event
            </Button>
          </div>

          {events.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300 bg-white/60 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 gradient-primary-soft rounded-2xl flex items-center justify-center mb-6">
                  <CalendarDays className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-2xl mb-3">No events yet</h3>
                <p className="text-gray-600 mb-8 text-center max-w-md text-lg">
                  Get started by creating your first event. You'll be able to manage participants,
                  agenda, and track attendance.
                </p>
                <Button onClick={handleCreateEvent} size="lg" className="gradient-primary hover:opacity-90 shadow-lg shadow-purple-500/30 h-12 px-6">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const participants = localDB.getAllParticipants(event.id);
                const agendaItems = localDB.getAllAgenda(event.id);
                
                return (
                  <Card key={event.id} className="card-elevated bg-white border-0 overflow-hidden group">
                    <div className="h-2 gradient-primary"></div>
                    <CardHeader className="pb-4">
                      <CardTitle className="line-clamp-1 text-xl">{event.name}</CardTitle>
                      <div className="space-y-2 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">
                            {formatDate(event.startDate)}
                            {event.endDate && ` - ${formatDate(event.endDate)}`}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-pink-500" />
                            <span className="text-sm line-clamp-1">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-5 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
                          <div className="text-2xl bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">{participants.length}</div>
                          <div className="text-xs text-purple-700 mt-1">Participants</div>
                        </div>
                        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center border border-pink-200">
                          <div className="text-2xl bg-gradient-to-r from-pink-600 to-pink-700 bg-clip-text text-transparent">{agendaItems.length}</div>
                          <div className="text-xs text-pink-700 mt-1">Sessions</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleSelectEvent(event.id)}
                          className="flex-1 gradient-primary hover:opacity-90 shadow-md shadow-purple-500/30"
                        >
                          Manage
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditEvent(event)}
                          variant="outline"
                          size="icon"
                          className="border-gray-300 hover:border-purple-500 hover:text-purple-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteEvent(event.id, event.name)}
                          variant="outline"
                          size="icon"
                          className="border-gray-300 hover:border-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Annual Tech Conference 2024"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Convention Center Hall A"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the event..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCreate}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Event Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Annual Tech Conference 2024"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate">Start Date *</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Convention Center Hall A"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the event..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data Migration Dialog */}
      <DataMigrationDialog 
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
      />
    </div>
  );
}
