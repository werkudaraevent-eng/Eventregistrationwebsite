import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Plus, Calendar, MapPin, Edit, Trash2, LogOut, ArrowRight, CalendarDays } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  createdAt: string;
}

interface EventSelectionProps {
  onEventSelected: (eventId: string) => void;
  onLogout: () => void;
}

export function EventSelection({ onEventSelected, onLogout }: EventSelectionProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
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

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
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

  const handleSubmitCreate = async () => {
    if (!formData.name || !formData.startDate) {
      alert('Please fill in required fields (Event Name and Start Date)');
      return;
    }

    try {
      // Generate UUID for new event
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('events')
        .insert([
          {
            id: eventId,
            name: formData.name,
            startDate: formData.startDate,
            endDate: formData.endDate || null,
            location: formData.location,
            description: formData.description,
            createdAt: new Date().toISOString(),
          }
        ]);

      if (error) {
        console.error('Error creating event:', error);
        alert('Failed to create event');
      } else {
        loadEvents();
        setShowCreateDialog(false);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }
  };

  const handleSubmitEdit = async () => {
    if (!editingEvent) return;
    
    if (!formData.name || !formData.startDate) {
      alert('Please fill in required fields (Event Name and Start Date)');
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          location: formData.location,
          description: formData.description,
        })
        .eq('id', editingEvent.id);

      if (error) {
        console.error('Error updating event:', error);
        alert('Failed to update event');
      } else {
        loadEvents();
        setShowEditDialog(false);
        setEditingEvent(null);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (confirm(`Are you sure you want to delete "${eventName}"?\n\nThis will permanently delete all participants, agenda items, and attendance records associated with this event.`)) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);

        if (error) {
          console.error('Error deleting event:', error);
          alert('Failed to delete event');
        } else {
          loadEvents();
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
      }
    }
  };

  const handleSelectEvent = (eventId: string) => {
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-sky-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-700">Event Management System</h1>
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
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl mb-2">Your Events</h2>
              <p className="text-gray-600 text-lg">
                {events.length} {events.length === 1 ? 'event' : 'events'} total
              </p>
            </div>
            <Button onClick={handleCreateEvent} size="lg" className="gradient-primary hover:opacity-90 shadow-primary h-12 px-6">
              <Plus className="mr-2 h-5 w-5" />
              Create New Event
            </Button>
          </div>

          {events.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300 bg-white/60 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 gradient-primary-soft rounded-2xl flex items-center justify-center mb-6">
                  <CalendarDays className="h-10 w-10 text-primary-600" />
                </div>
                <h3 className="text-2xl mb-3">No events yet</h3>
                <p className="text-gray-600 mb-8 text-center max-w-md text-lg">
                  Get started by creating your first event. You'll be able to manage participants,
                  agenda, and track attendance.
                </p>
                <Button onClick={handleCreateEvent} size="lg" className="gradient-primary hover:opacity-90 shadow-primary h-12 px-6">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                return (
                  <Card key={event.id} className="card-elevated bg-white border-0 overflow-hidden group">
                    <div className="h-2 gradient-primary"></div>
                    <CardHeader className="pb-4">
                      <CardTitle className="line-clamp-1 text-xl">{event.name}</CardTitle>
                      <div className="space-y-2 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary-500" />
                          <span className="text-sm">
                            {formatDate(event.startDate)}
                            {event.endDate && ` - ${formatDate(event.endDate)}`}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-cyan-500" />
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
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleSelectEvent(event.id)}
                          className="flex-1 gradient-primary hover:opacity-90 shadow-primary-sm"
                        >
                          Manage
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditEvent(event)}
                          variant="outline"
                          size="icon"
                          className="border-neutral-300 hover:border-primary-500 hover:text-primary-600"
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
            <DialogDescription>Create a new event to manage participants and agenda</DialogDescription>
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
            <DialogDescription>Update event details</DialogDescription>
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
    </div>
  );
}
