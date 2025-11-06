import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Loader2, Search, Trash2, Download, Users, Plus, Upload, Link2 } from 'lucide-react';
import { ColumnManagement } from './ColumnManagement';
import localDB from '../utils/localDBStub';
import { supabase } from '../utils/supabase/client';

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

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
  order: number;
}

interface ColumnVisibility {
  phone: boolean;
  company: boolean;
  position: boolean;
  attendance: boolean;
  registered: boolean;
}

interface ParticipantManagementProps {
  eventId: string;
  accessToken: string;
}

export function ParticipantManagement({ eventId, accessToken }: ParticipantManagementProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    phone: true,
    company: true,
    position: true,
    attendance: true,
    registered: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    customData: {} as Record<string, any>
  });

  const fetchParticipants = async () => {
    setIsLoading(true);
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
      console.log('[SUPABASE] Raw data:', data);
      
      // Data already in camelCase from database
      const convertedParticipants = (data || []).map((p: any) => ({
        id: p.id,
        eventId: p.eventId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        company: p.company,
        position: p.position,
        registeredAt: p.registeredAt,
        attendance: p.attendance || [],
        customData: p.customData || {}
      }));
      
      console.log('[SUPABASE] Converted participants:', convertedParticipants);
      setParticipants(convertedParticipants);
      setFilteredParticipants(convertedParticipants);
      setLastUpdated(new Date());
      
      // Load custom fields for this event
      const event = localDB.getEventById(eventId);
      if (event?.customFields) {
        setCustomFields([...event.customFields].sort((a, b) => a.order - b.order));
      } else {
        setCustomFields([]);
      }
      
      // Load column visibility settings
      const visibility = localDB.getColumnVisibility(eventId);
      setColumnVisibility(visibility);
    } catch (err: any) {
      console.error('[SUPABASE] Error fetching participants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [eventId, accessToken]);

  // Supabase Realtime subscription - smooth real-time updates
  useEffect(() => {
    console.log('[REALTIME] Setting up Supabase Realtime subscription for event:', eventId);
    
    const subscription = supabase
      .channel(`participants_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'participants',
          filter: `eventId=eq.${eventId}`
        },
        (payload) => {
          console.log('[REALTIME] Participant data changed:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newParticipant = {
              id: payload.new.id,
              eventId: payload.new.eventId,
              name: payload.new.name,
              email: payload.new.email,
              phone: payload.new.phone,
              company: payload.new.company,
              position: payload.new.position,
              registeredAt: payload.new.registeredAt,
              attendance: payload.new.attendance || [],
              customData: payload.new.customData || {}
            };
            setParticipants(prev => [...prev, newParticipant]);
            setFilteredParticipants(prev => [...prev, newParticipant]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedParticipant = {
              id: payload.new.id,
              eventId: payload.new.eventId,
              name: payload.new.name,
              email: payload.new.email,
              phone: payload.new.phone,
              company: payload.new.company,
              position: payload.new.position,
              registeredAt: payload.new.registeredAt,
              attendance: payload.new.attendance || [],
              customData: payload.new.customData || {}
            };
            setParticipants(prev => 
              prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
            );
            setFilteredParticipants(prev =>
              prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
            );
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
            setFilteredParticipants(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[REALTIME] Unsubscribing from Realtime');
      supabase.removeChannel(subscription);
    };
  }, [eventId]);

  useEffect(() => {
    const filtered = participants.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredParticipants(filtered);
  }, [searchQuery, participants]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('[SUPABASE] Adding participant:', formData);
      
      const participantId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const participant = {
        id: participantId,
        eventId: eventId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        company: formData.company || '',
        position: formData.position || '',
        registeredAt: new Date().toISOString(),
        attendance: [],
        customData: formData.customData || {}
      };
      
      const { error } = await supabase
        .from('participants')
        .insert([participant]);
      
      if (error) {
        throw new Error(`Failed to add participant: ${error.message}`);
      }
      
      console.log('[SUPABASE] Participant added successfully');
      alert('Participant added successfully!');
      setFormData({ name: '', email: '', phone: '', company: '', position: '', customData: {} });
      setIsAddDialogOpen(false);
      await fetchParticipants();
      
      // Realtime subscription will handle UI updates automatically
    } catch (err: any) {
      console.error('[SUPABASE] Error adding participant:', err);
      alert(err.message || 'Failed to add participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      const participantsToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const participant: any = {
          id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          eventId: eventId,
          registeredAt: new Date().toISOString(),
          attendance: [],
          customData: {}
        };

        headers.forEach((header, index) => {
          if (header === 'name') participant.name = values[index];
          else if (header === 'email') participant.email = values[index];
          else if (header === 'phone') participant.phone = values[index];
          else if (header === 'company') participant.company = values[index];
          else if (header === 'position') participant.position = values[index];
        });

        if (participant.name && participant.email) {
          participantsToImport.push(participant);
        }
      }

      if (participantsToImport.length === 0) {
        throw new Error('No valid participants found in CSV');
      }

      // Import participants to Supabase
      console.log('[SUPABASE] Bulk importing participants:', participantsToImport.length);
      
      const { error } = await supabase
        .from('participants')
        .insert(participantsToImport);
      
      if (error) {
        throw new Error(`Failed to import participants: ${error.message}`);
      }

      alert(`Successfully imported ${participantsToImport.length} participants.`);
      await fetchParticipants();
    } catch (err: any) {
      console.error('[SUPABASE] Error importing CSV:', err);
      alert(err.message || 'Failed to import CSV');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this participant?')) {
      return;
    }

    try {
      console.log('[SUPABASE] Deleting participant:', id);
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(`Failed to delete participant: ${error.message}`);
      }
      
      await fetchParticipants();
    } catch (err: any) {
      console.error('[SUPABASE] Error deleting participant:', err);
      alert('Failed to delete participant');
    }
  };

  const exportToCSV = () => {
    // Build headers with custom fields
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Position'];
    customFields.forEach(field => headers.push(field.label));
    headers.push('Attendance Count', 'Registered At');
    
    const rows = participants.map(p => {
      const row = [
        p.id,
        p.name,
        p.email,
        p.phone || '',
        p.company || '',
        p.position || '',
      ];
      
      // Add custom field values
      customFields.forEach(field => {
        row.push(p.customData?.[field.id] || '');
      });
      
      // Add attendance and registration info
      row.push((p.attendance || []).length.toString());
      row.push(new Date(p.registeredAt).toLocaleString());
      
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadCSVTemplate = () => {
    const csvContent = 'Name,Email,Phone,Company,Position\n"John Doe","john@example.com","+1234567890","Acme Inc","Manager"';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participant-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const copyRegistrationURL = () => {
    const registrationURL = `${window.location.origin}${window.location.pathname}?register=${eventId}`;
    navigator.clipboard.writeText(registrationURL).then(() => {
      alert('Registration URL copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy URL');
    });
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
                <Users className="h-5 w-5 text-white" />
              </div>
              Participants Management
            </CardTitle>
            <CardDescription className="flex items-center gap-3 mt-2 text-base">
              <span className="bg-white px-3 py-1 rounded-full border border-purple-200">
                Total: <span className="font-semibold text-purple-700">{participants.length}</span>
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Auto-sync • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={copyRegistrationURL} 
              variant="outline"
              size="sm"
              className="border-purple-300 hover:border-purple-500 hover:bg-purple-50"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Copy Registration URL
            </Button>
            
            <ColumnManagement 
              eventId={eventId}
              onFieldsUpdated={fetchParticipants}
            />
            
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              size="sm"
              disabled={isImporting}
              className="border-gray-300 hover:border-gray-400"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </>
              )}
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="border-gray-300 hover:border-gray-400">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary hover:opacity-90 shadow-md shadow-purple-500/30">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Participant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Participant Manually</DialogTitle>
                  <DialogDescription>
                    Enter participant details to add them to the event
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddParticipant} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Full Name *</Label>
                    <Input
                      id="add-name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-email">Email *</Label>
                    <Input
                      id="add-email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-phone">Phone</Label>
                    <Input
                      id="add-phone"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-company">Company</Label>
                    <Input
                      id="add-company"
                      placeholder="Acme Inc."
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-position">Position</Label>
                    <Input
                      id="add-position"
                      placeholder="Software Engineer"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Participant'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name, email, company, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-300 transition-colors"
            />
          </div>
          <Button onClick={downloadCSVTemplate} variant="outline" size="sm" className="border-gray-300 hover:border-gray-400">
            Download Template
          </Button>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                {columnVisibility.phone && <TableHead>Phone</TableHead>}
                {columnVisibility.company && <TableHead>Company</TableHead>}
                {columnVisibility.position && <TableHead>Position</TableHead>}
                {customFields.map(field => (
                  <TableHead key={field.id}>{field.label}</TableHead>
                ))}
                {columnVisibility.attendance && <TableHead>Attendance</TableHead>}
                {columnVisibility.registered && <TableHead>Registered</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + 
                    (columnVisibility.phone ? 1 : 0) +
                    (columnVisibility.company ? 1 : 0) +
                    (columnVisibility.position ? 1 : 0) +
                    customFields.length +
                    (columnVisibility.attendance ? 1 : 0) +
                    (columnVisibility.registered ? 1 : 0) +
                    1} className="text-center text-muted-foreground">
                    No participants found
                  </TableCell>
                </TableRow>
              ) : (
                filteredParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-mono text-sm">{participant.id}</TableCell>
                    <TableCell>{participant.name}</TableCell>
                    <TableCell>{participant.email}</TableCell>
                    {columnVisibility.phone && <TableCell>{participant.phone || '-'}</TableCell>}
                    {columnVisibility.company && <TableCell>{participant.company || '-'}</TableCell>}
                    {columnVisibility.position && <TableCell>{participant.position || '-'}</TableCell>}
                    {customFields.map(field => (
                      <TableCell key={field.id}>
                        {participant.customData?.[field.id] || '-'}
                      </TableCell>
                    ))}
                    {columnVisibility.attendance && (
                      <TableCell>
                        <Badge variant="secondary">
                          {(participant.attendance || []).length} sessions
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.registered && (
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(participant.registeredAt).toLocaleDateString()}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(participant.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
