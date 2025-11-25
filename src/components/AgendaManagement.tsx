import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Calendar, Clock, Loader2, MapPin, Plus, Trash2, Users, MoreVertical, LogIn, Edit, RefreshCw, Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface AgendaItem {
  id: string;
  eventId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  createdAt: string;
  order: number;
}

interface Participant {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  registeredAt: string;
  attendance: Array<{ agendaItem: string; timestamp: string }>;
  customData?: Record<string, any>;
}

interface AgendaManagementProps {
  eventId: string;
  accessToken: string;
}

export function AgendaManagement({ eventId, accessToken }: AgendaManagementProps) {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAgendaForParticipants, setSelectedAgendaForParticipants] = useState<string | null>(null);
  const [editingAgenda, setEditingAgenda] = useState<AgendaItem | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search and sort when dialog opens/closes
  useEffect(() => {
    if (!selectedAgendaForParticipants) {
      setSearchTerm('');
      setSortConfig(null);
    }
  }, [selectedAgendaForParticipants]);

  // Calculate dropdown position based on viewport
  const calculateDropdownPosition = useCallback((button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 150; // Approximate dropdown height

    const position: { top?: number; bottom?: number; right: number } = {
      right: viewportWidth - rect.right
    };

    // If not enough space below but more space above, show above
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      position.bottom = viewportHeight - rect.top + 4; // 4px gap
    } else {
      position.top = rect.bottom + 4; // 4px gap
    }

    setDropdownPosition(position);
  }, []);

  const fetchAgenda = async () => {
    setIsLoading(true);
    try {
      console.log('[SUPABASE] Fetching agenda from Supabase for event:', eventId);
      
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('eventId', eventId)
        .order('startTime', { ascending: true });
      
      if (error) {
        throw new Error(`Failed to fetch agenda: ${error.message}`);
      }
      
      console.log('[SUPABASE] Found agenda items:', data?.length);
      
      // Add order property if not exists
      const agendaWithOrder = (data || []).map((item: any, idx: number) => ({
        ...item,
        order: idx
      }));
      
      setAgendaItems(agendaWithOrder);
    } catch (err: any) {
      console.error('[SUPABASE] Error fetching agenda:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      console.log('[SUPABASE] Fetching participants from Supabase for event:', eventId);
      
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('eventId', eventId);
      
      if (error) {
        throw new Error(`Failed to fetch participants: ${error.message}`);
      }
      
      console.log('[SUPABASE] Found participants:', data?.length);
      setParticipants(data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[SUPABASE] Error fetching participants:', err);
    }
  };

  useEffect(() => {
    fetchAgenda();
    fetchParticipants();
  }, [eventId, accessToken]);

  // Auto-refresh: Listen for localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      console.log('[AGENDA AUTO-REFRESH] Storage event detected:', e.key);
      if (e.key === 'event_participants') {
        console.log('[AGENDA AUTO-REFRESH] Participant data changed, refreshing...');
        fetchParticipants();
      }
      if (e.key === 'event_agenda') {
        console.log('[AGENDA AUTO-REFRESH] Agenda data changed, refreshing...');
        fetchAgenda();
      }
    };

    // Custom event listener for same-tab updates (instant)
    const handleParticipantsUpdated = (e: Event) => {
      console.log('[AGENDA AUTO-REFRESH] Custom participantsUpdated event detected:', (e as CustomEvent).detail);
      fetchParticipants();
    };

    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('participantsUpdated', handleParticipantsUpdated);

    // Polling mechanism for same-tab updates (every 3 seconds) - fallback
    const pollInterval = setInterval(() => {
      console.log('[AGENDA AUTO-REFRESH] Polling for participant updates...');
      fetchParticipants();
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('participantsUpdated', handleParticipantsUpdated);
      clearInterval(pollInterval);
    };
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('[SUPABASE] Saving agenda item:', formData);
      
      if (editingAgenda) {
        // Update existing agenda
        const { error } = await supabase
          .from('agenda_items')
          .update({
            title: formData.title,
            description: formData.description,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location
          })
          .eq('id', editingAgenda.id);
        
        if (error) {
          throw new Error(`Failed to update agenda item: ${error.message}`);
        }
        console.log('[SUPABASE] Agenda item updated successfully');
      } else {
        // Create new agenda
        const agendaId = `agenda_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const agendaItem = {
          id: agendaId,
          eventId: eventId,
          title: formData.title,
          description: formData.description,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location,
          createdAt: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('agenda_items')
          .insert([agendaItem]);
        
        if (error) {
          throw new Error(`Failed to create agenda item: ${error.message}`);
        }
        console.log('[SUPABASE] Agenda item created successfully');
      }

      alert(editingAgenda ? 'Agenda item updated successfully!' : 'Agenda item created successfully!');
      setFormData({ title: '', description: '', startTime: '', endTime: '', location: '' });
      setEditingAgenda(null);
      setIsDialogOpen(false);
      await fetchAgenda();
    } catch (err: any) {
      console.error('[SUPABASE] Error saving agenda item:', err);
      alert(err.message || (editingAgenda ? 'Failed to update agenda item' : 'Failed to create agenda item'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: AgendaItem) => {
    setEditingAgenda(item);
    setFormData({
      title: item.title,
      description: item.description,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
    });
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingAgenda(null);
      setFormData({ title: '', description: '', startTime: '', endTime: '', location: '' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agenda item?')) {
      return;
    }

    try {
      console.log('[SUPABASE] Deleting agenda item:', id);
      
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(`Failed to delete agenda item: ${error.message}`);
      }
      
      alert('Agenda item deleted successfully');
      await fetchAgenda();
    } catch (err: any) {
      console.error('[SUPABASE] Error deleting agenda item:', err);
      alert(err.message || 'Failed to delete agenda item');
    }
  };

  const formatTime = (datetime: string) => {
    if (!datetime) return '-';
    return new Date(datetime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getParticipantsForAgenda = (agendaTitle: string) => {
    return participants.filter(p => 
      p.attendance && p.attendance.some(a => a.agendaItem === agendaTitle)
    );
  };

  const handleSort = (field: string) => {
    setSortConfig(current => {
      if (!current || current.field !== field) {
        return { field, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return null; // Clear sort
    });
  };

  const getFilteredAndSortedParticipants = (agendaTitle: string) => {
    let filtered = getParticipantsForAgenda(agendaTitle);

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.company || '').toLowerCase().includes(term)
      );
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.field === 'checkInTime') {
          const aAttendance = a.attendance.find(att => att.agendaItem === agendaTitle);
          const bAttendance = b.attendance.find(att => att.agendaItem === agendaTitle);
          aValue = aAttendance ? new Date(aAttendance.timestamp).getTime() : 0;
          bValue = bAttendance ? new Date(bAttendance.timestamp).getTime() : 0;
        } else {
          aValue = (a[sortConfig.field as keyof Participant] || '').toString().toLowerCase();
          bValue = (b[sortConfig.field as keyof Participant] || '').toString().toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const getSortIcon = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-purple-600" />
      : <ArrowDown className="h-3 w-3 text-purple-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md shadow-purple-500/30">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              Event Agenda
            </CardTitle>
            <CardDescription className="flex items-center gap-3 mt-2 text-base">
              <span>Manage event schedule and sessions</span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Auto-sync • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-gray-300 hover:border-gray-400"
              size="sm"
              onClick={() => {
                fetchAgenda();
                fetchParticipants();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button className="gradient-primary hover:opacity-90 shadow-md shadow-purple-500/30">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAgenda ? 'Edit Agenda Item' : 'Create Agenda Item'}</DialogTitle>
                  <DialogDescription>
                    {editingAgenda ? 'Update the session details' : 'Add a new session or activity to the event schedule'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Session Title *</Label>
                    <Input
                      id="title"
                      placeholder="Opening Ceremony"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the session..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time *</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="Main Hall"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingAgenda ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingAgenda ? 'Update Session' : 'Create Session'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-visible">
        {agendaItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No agenda items yet</p>
            <p className="text-sm">Click "Add Session" to create the event schedule</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Check-in Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendaItems
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div>{item.title}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatTime(item.startTime)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatTime(item.endTime)}</span>
                      </TableCell>
                      <TableCell>
                        {item.location ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{item.location}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">
                            {getParticipantsForAgenda(item.title).length}
                          </span>
                          <span className="text-xs text-muted-foreground">attendees</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAgendaForParticipants(item.title)}
                            title="View Participants"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <div className="relative">
                            <Button 
                              ref={(el: HTMLButtonElement | null) => {
                                if (el) buttonRefs.current[item.id] = el;
                              }}
                              variant="ghost" 
                              size="sm"
                              title="More options"
                              onClick={(e: React.MouseEvent) => {
                                const isOpening = openDropdownId !== item.id;
                                setOpenDropdownId(isOpening ? item.id : null);
                                if (isOpening && e.currentTarget) {
                                  calculateDropdownPosition(e.currentTarget as HTMLElement);
                                }
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dropdown Menu Portal - Rendered outside table to prevent clipping */}
        {openDropdownId && (
          <div 
            ref={dropdownRef}
            className="fixed w-48 bg-popover border rounded-md shadow-xl p-1"
            style={{
              top: dropdownPosition.top,
              bottom: dropdownPosition.bottom,
              right: dropdownPosition.right,
              zIndex: 9999,
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto'
            }}
          >
            {agendaItems.find(item => item.id === openDropdownId) && (() => {
              const item = agendaItems.find(i => i.id === openDropdownId)!;
              return (
                <>
                  <button
                    onClick={() => {
                      // Open check-in page in new window
                      const checkInUrl = `${window.location.origin}${window.location.pathname}?checkin=${item.id}`;
                      window.open(checkInUrl, '_blank');
                      setOpenDropdownId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground outline-none cursor-pointer text-left"
                  >
                    <LogIn className="h-4 w-4" />
                    Open Check-In Page
                  </button>
                  <button
                    onClick={() => {
                      handleEdit(item);
                      setOpenDropdownId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground outline-none cursor-pointer text-left"
                  >
                    <Edit className="h-4 w-4" />
                    Modify
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(item.id);
                      setOpenDropdownId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-destructive/10 text-destructive outline-none cursor-pointer text-left"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* Participants List Dialog */}
        <Dialog open={!!selectedAgendaForParticipants} onOpenChange={(open: boolean) => !open && setSelectedAgendaForParticipants(null)}>
          <DialogContent className="flex flex-col p-0" style={{ width: '90vw', maxWidth: '90vw', height: '90vh', maxHeight: '90vh' }}>
            <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">Participants for: {selectedAgendaForParticipants}</DialogTitle>
                  <DialogDescription className="mt-1">
                    {selectedAgendaForParticipants && getFilteredAndSortedParticipants(selectedAgendaForParticipants).length} attendees
                    {searchTerm && selectedAgendaForParticipants && ` (filtered from ${getParticipantsForAgenda(selectedAgendaForParticipants).length} total)`}
                  </DialogDescription>
                </div>
                <button
                  onClick={() => {
                    if (!selectedAgendaForParticipants) return;
                    const participants = getFilteredAndSortedParticipants(selectedAgendaForParticipants);
                    
                    // Prepare CSV data
                    const headers = ['Name', 'Email', 'Company', 'Position', 'Check-in Time'];
                    const rows = participants.map(participant => {
                      const attendance = participant.attendance.find(a => a.agendaItem === selectedAgendaForParticipants);
                      return [
                        participant.name,
                        participant.email,
                        participant.company || '-',
                        participant.position || '-',
                        attendance ? new Date(attendance.timestamp).toLocaleString() : '-'
                      ];
                    });
                    
                    // Create CSV content
                    const csvContent = [
                      headers.join(','),
                      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                    ].join('\n');
                    
                    // Download CSV
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${selectedAgendaForParticipants}_participants_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-purple-500/30"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
              
              {/* Search Box */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden relative">
              {selectedAgendaForParticipants && getFilteredAndSortedParticipants(selectedAgendaForParticipants).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  {searchTerm ? (
                    <>
                      <p className="text-lg">No participants found matching "{searchTerm}"</p>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-4 text-purple-600 hover:text-purple-700 underline"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <p className="text-lg">No participants yet for this session</p>
                  )}
                </div>
              ) : (
                <div 
                  className="overflow-x-auto overflow-y-auto h-full"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#a855f7 #f3f4f6'
                  }}
                >
                  <table className="w-full caption-bottom text-sm" style={{ minWidth: '800px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} className="border-b">
                      <tr className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
                        <th 
                          className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap cursor-pointer hover:bg-purple-50 transition-colors" 
                          style={{ minWidth: '180px' }}
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Name
                            {getSortIcon('name')}
                          </div>
                        </th>
                        <th 
                          className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap cursor-pointer hover:bg-purple-50 transition-colors" 
                          style={{ minWidth: '220px' }}
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center gap-2">
                            Email
                            {getSortIcon('email')}
                          </div>
                        </th>
                        <th 
                          className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap cursor-pointer hover:bg-purple-50 transition-colors" 
                          style={{ minWidth: '180px' }}
                          onClick={() => handleSort('company')}
                        >
                          <div className="flex items-center gap-2">
                            Company
                            {getSortIcon('company')}
                          </div>
                        </th>
                        <th 
                          className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap cursor-pointer hover:bg-purple-50 transition-colors" 
                          style={{ minWidth: '150px' }}
                          onClick={() => handleSort('position')}
                        >
                          <div className="flex items-center gap-2">
                            Position
                            {getSortIcon('position')}
                          </div>
                        </th>
                        <th 
                          className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap cursor-pointer hover:bg-purple-50 transition-colors" 
                          style={{ minWidth: '180px' }}
                          onClick={() => handleSort('checkInTime')}
                        >
                          <div className="flex items-center gap-2">
                            Check-in Time
                            {getSortIcon('checkInTime')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {selectedAgendaForParticipants && getFilteredAndSortedParticipants(selectedAgendaForParticipants).map((participant) => {
                        const attendance = participant.attendance.find(a => a.agendaItem === selectedAgendaForParticipants);
                        return (
                          <tr key={participant.id} className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
                            <td className="h-10 px-4 align-middle font-medium" style={{ minWidth: '180px' }}>{participant.name}</td>
                            <td className="h-10 px-4 align-middle" style={{ minWidth: '220px' }}>{participant.email}</td>
                            <td className="h-10 px-4 align-middle" style={{ minWidth: '180px' }}>{participant.company || '-'}</td>
                            <td className="h-10 px-4 align-middle" style={{ minWidth: '150px' }}>{participant.position || '-'}</td>
                            <td className="h-10 px-4 align-middle text-sm text-muted-foreground" style={{ minWidth: '180px' }}>
                              {attendance && new Date(attendance.timestamp).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Scroll hint */}
            {selectedAgendaForParticipants && getParticipantsForAgenda(selectedAgendaForParticipants).length > 5 && (
              <div className="text-center py-2 text-xs text-gray-400 border-t bg-gray-50/50">
                ← Scroll to see all participants →
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}