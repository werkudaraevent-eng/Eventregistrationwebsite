import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Search, Trash2, Download, Users, Plus, Upload, Link2, Edit, ArrowUpDown, ArrowUp, ArrowDown, Mail, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { ColumnManagement } from './ColumnManagement';
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
  email_status?: 'not_sent' | 'sent' | 'failed' | 'pending';
  last_email_sent_at?: string;
  email_send_count?: number;
  email_last_error?: string;
}

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select';
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('registeredAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Column resize states
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    id: 130,
    name: 180,
    email: 220,
    phone: 150,
    company: 180,
    position: 150,
    attendance: 120,
    registered: 130,
    emailStatus: 150,
    actions: 180
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  
  // Email sending states
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredParticipants.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedParticipants = filteredParticipants.slice(startIndex, endIndex);
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
    } catch (err: any) {
      console.error('[SUPABASE] Error fetching participants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load custom fields and column visibility from Supabase
  const loadColumnSettings = async () => {
    try {
      // Get event from Supabase to get columnVisibility and customFields
      const { data, error } = await supabase
        .from('events')
        .select('customFields, columnVisibility')
        .eq('id', eventId)
        .single();
      
      if (error) {
        console.error('[SUPABASE] Error loading column settings:', error);
        return;
      }
      
      // Load custom fields
      if (data?.customFields) {
        setCustomFields([...data.customFields].sort((a: any, b: any) => a.order - b.order));
      } else {
        setCustomFields([]);
      }
      
      // Load column visibility settings
      if (data?.columnVisibility) {
        setColumnVisibility(data.columnVisibility);
      }
    } catch (err: any) {
      console.error('[SUPABASE] Error in loadColumnSettings:', err);
    }
  };

  useEffect(() => {
    fetchParticipants();
    loadColumnSettings();
  }, [eventId, accessToken]);

  // Supabase Realtime subscription - smooth real-time updates
  useEffect(() => {
    console.log('[REALTIME] Setting up Supabase Realtime subscription for event:', eventId);
    
    // Subscribe to participants changes
    const participantsSubscription = supabase
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

    // Subscribe to event settings changes (columnVisibility, customFields)
    const eventSubscription = supabase
      .channel(`events_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        (payload) => {
          console.log('[REALTIME] Event settings changed (columnVisibility or customFields)');
          
          // Update custom fields if changed
          if (payload.new.customFields) {
            const sortedFields = [...payload.new.customFields].sort((a: any, b: any) => a.order - b.order);
            setCustomFields(sortedFields);
          }
          
          // Update column visibility if changed
          if (payload.new.columnVisibility) {
            console.log('[REALTIME] Column visibility updated:', payload.new.columnVisibility);
            setColumnVisibility(payload.new.columnVisibility);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[REALTIME] Unsubscribing from Realtime');
      supabase.removeChannel(participantsSubscription);
      supabase.removeChannel(eventSubscription);
    };
  }, [eventId]);

  useEffect(() => {
    let filtered = participants.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Apply sorting
    filtered = filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // Handle different field types
      if (sortField === 'registeredAt') {
        aValue = new Date(a.registeredAt).getTime();
        bValue = new Date(b.registeredAt).getTime();
      } else if (sortField === 'attendance') {
        aValue = (a.attendance || []).length;
        bValue = (b.attendance || []).length;
      } else if (sortField.startsWith('custom_')) {
        const fieldName = sortField.replace('custom_', '');
        aValue = a.customData?.[fieldName] || '';
        bValue = b.customData?.[fieldName] || '';
      } else {
        aValue = (a as any)[sortField] || '';
        bValue = (b as any)[sortField] || '';
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredParticipants(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, participants, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3 text-blue-600" />
      : <ArrowDown className="ml-1 h-3 w-3 text-blue-600" />;
  };

  // Column resize handlers
  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnKey] || 150);
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff); // Minimum 80px
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, startX, startWidth]);

  // Resize handle component
  const ResizeHandle = ({ columnKey }: { columnKey: string }) => (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 group"
      onMouseDown={(e) => handleResizeStart(columnKey, e)}
      style={{ userSelect: 'none' }}
    >
      <div className="absolute right-0 top-0 h-full w-1 bg-transparent group-hover:bg-blue-500" />
    </div>
  );

  // Load email templates
  const loadEmailTemplates = async () => {
    try {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('event_id', eventId)
        .order('name');
      
      if (data) {
        setEmailTemplates(data);
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  };

  // Open send email dialog
  const handleOpenSendEmail = (participant: Participant) => {
    setSelectedParticipant(participant);
    setSelectedTemplateId('');
    setShowSendEmailDialog(true);
    if (emailTemplates.length === 0) {
      loadEmailTemplates();
    }
  };

  // Send email to single participant
  const handleSendEmail = async () => {
    if (!selectedParticipant || !selectedTemplateId) {
      alert('Please select a template');
      return;
    }

    try {
      setIsSendingEmail(true);

      // Get template
      const template = emailTemplates.find(t => t.id === selectedTemplateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get event details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      // Replace placeholders
      const replacePlaceholders = (text: string) => {
        return text
          .replace(/\{\{name\}\}/g, selectedParticipant.name || '')
          .replace(/\{\{email\}\}/g, selectedParticipant.email || '')
          .replace(/\{\{phone\}\}/g, selectedParticipant.phone || '')
          .replace(/\{\{company\}\}/g, selectedParticipant.company || '')
          .replace(/\{\{position\}\}/g, selectedParticipant.position || '')
          .replace(/\{\{event_name\}\}/g, eventData?.name || '')
          .replace(/\{\{event_date\}\}/g, eventData?.startDate || '')
          .replace(/\{\{participant_id\}\}/g, selectedParticipant.id || '');
      };

      const personalizedSubject = replacePlaceholders(template.subject);
      const personalizedBody = replacePlaceholders(template.body);

      console.log('=== SENDING EMAIL ===');
      console.log('To:', selectedParticipant.email);
      console.log('Subject:', personalizedSubject);

      // Send email via Supabase Edge Function
      const { data, error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          to: selectedParticipant.email,
          subject: personalizedSubject,
          html: personalizedBody,
          participantId: selectedParticipant.id,
          templateId: template.id
        }
      });

      if (sendError) {
        console.error('❌ Failed to send email:', sendError);
        
        // Update status to failed
        await supabase.rpc('update_participant_email_status', {
          p_participant_id: selectedParticipant.id,
          p_template_id: template.id,
          p_template_name: template.name,
          p_subject: personalizedSubject,
          p_status: 'failed',
          p_error_message: sendError.message || 'Failed to send email'
        });

        alert(`❌ Failed to send email to ${selectedParticipant.name}\n\nError: ${sendError.message}`);
        return;
      }

      console.log('✅ Email sent successfully:', data);

      // Update participant email status to sent
      await supabase.rpc('update_participant_email_status', {
        p_participant_id: selectedParticipant.id,
        p_template_id: template.id,
        p_template_name: template.name,
        p_subject: personalizedSubject,
        p_status: 'sent',
        p_error_message: null
      });

      // Refresh participants to show updated status
      await fetchParticipants();

      alert(`✅ Email sent successfully to ${selectedParticipant.name}!`);
      
      setShowSendEmailDialog(false);
      setSelectedParticipant(null);
      setSelectedTemplateId('');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email: ' + (error as Error).message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Get email status badge
  const getEmailStatusBadge = (participant: Participant) => {
    const status = participant.email_status || 'not_sent';
    
    const config: Record<string, { label: string; icon: any; className: string }> = {
      not_sent: { label: 'Not Sent', icon: Mail, className: 'bg-gray-100 text-gray-700 border-gray-300' },
      sent: { label: 'Sent', icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-300' },
      failed: { label: 'Failed', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-300' },
      pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-100 text-yellow-700 border-yellow-300' }
    };

    const { label, icon: Icon, className } = config[status];

    return (
      <div className="flex flex-col gap-1">
        <Badge className={`${className} border flex items-center gap-1 w-fit`}>
          <Icon className="h-3 w-3" />
          {label}
        </Badge>
        {participant.last_email_sent_at && (
          <span className="text-xs text-gray-500">
            {new Date(participant.last_email_sent_at).toLocaleDateString()}
          </span>
        )}
        {participant.email_send_count && participant.email_send_count > 0 && (
          <span className="text-xs text-gray-500">
            {participant.email_send_count} sent
          </span>
        )}
      </div>
    );
  };

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

  const handleOpenEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setFormData({
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      company: participant.company,
      position: participant.position,
      customData: participant.customData || {}
    });
    setError(null);
    setIsEditDialogOpen(true);
  };

  const handleEditParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('[SUPABASE] Updating participant:', editingParticipant.id);
      
      const { error } = await supabase
        .from('participants')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          position: formData.position,
          customData: formData.customData
        })
        .eq('id', editingParticipant.id);

      if (error) {
        throw new Error(`Failed to update participant: ${error.message}`);
      }

      setIsEditDialogOpen(false);
      setEditingParticipant(null);
      
      // Refresh participants list
      await fetchParticipants();
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        customData: {}
      });
    } catch (err: any) {
      console.error('[SUPABASE] Error updating participant:', err);
      setError(err.message || 'Failed to update participant');
    } finally {
      setIsSubmitting(false);
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
    <>
    <Card className="border-0 shadow-xl bg-white" style={{ position: 'relative', zIndex: 0 }}>
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
              onFieldsUpdated={loadColumnSettings}
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
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Participant Manually</DialogTitle>
                  <DialogDescription>
                    Enter participant details to add them to the event
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddParticipant} className="space-y-4 overflow-y-auto pr-2 flex-1">
                  {/* Standard Fields */}
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

                  {/* Dynamic Custom Fields */}
                  {customFields.length > 0 && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-semibold text-gray-700">Additional Fields</div>
                      {customFields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={`add-custom-${field.name}`}>
                            {field.label} {field.required && '*'}
                          </Label>
                          {field.type === 'textarea' ? (
                            <textarea
                              id={`add-custom-${field.name}`}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.name]: e.target.value }
                              }))}
                              required={field.required}
                            />
                          ) : field.type === 'select' && field.options ? (
                            <select
                              id={`add-custom-${field.name}`}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.name]: e.target.value }
                              }))}
                              required={field.required}
                            >
                              <option value="">Select {field.label.toLowerCase()}</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === 'date' ? (
                            <Input
                              id={`add-custom-${field.name}`}
                              type="date"
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.name]: e.target.value }
                              }))}
                              required={field.required}
                              className="w-full"
                            />
                          ) : (
                            <Input
                              id={`add-custom-${field.name}`}
                              type={field.type}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.name]: e.target.value }
                              }))}
                              required={field.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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

            {/* Edit Participant Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Edit Participant</DialogTitle>
                  <DialogDescription>
                    Update participant details
                  </DialogDescription>
                </DialogHeader>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleEditParticipant} className="space-y-4 overflow-y-auto pr-2 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name *</Label>
                    <Input
                      id="edit-name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-company">Company</Label>
                      <Input
                        id="edit-company"
                        placeholder="Acme Corp"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-position">Position</Label>
                      <Input
                        id="edit-position"
                        placeholder="Manager"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Dynamic Custom Fields */}
                  {customFields.length > 0 && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-semibold text-gray-700">Additional Fields</div>
                      {customFields.map(field => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={`edit-custom-${field.name}`}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {field.type === 'textarea' ? (
                            <textarea
                              id={`edit-custom-${field.name}`}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.name]: e.target.value
                                }
                              }))}
                              required={field.required}
                            />
                          ) : field.type === 'select' && field.options ? (
                            <select
                              id={`edit-custom-${field.name}`}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.name]: e.target.value
                                }
                              }))}
                              required={field.required}
                            >
                              <option value="">Select {field.label.toLowerCase()}</option>
                              {field.options.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : field.type === 'date' ? (
                            <Input
                              id={`edit-custom-${field.name}`}
                              type="date"
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.name]: e.target.value
                                }
                              }))}
                              required={field.required}
                              className="w-full"
                            />
                          ) : (
                            <Input
                              id={`edit-custom-${field.name}`}
                              type={field.type}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              value={formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.name]: e.target.value
                                }
                              }))}
                              required={field.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 gradient-primary hover:opacity-90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
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

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" style={{ position: 'relative', zIndex: 0 }}>
          <div className="overflow-x-auto" style={{ position: 'relative' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="relative"
                    style={{ width: `${columnWidths.id}px`, minWidth: `${columnWidths.id}px` }}
                  >
                    <button 
                      onClick={() => handleSort('id')}
                      className="flex items-center hover:text-gray-900 font-semibold w-full"
                    >
                      ID
                      <SortIcon field="id" />
                    </button>
                    <ResizeHandle columnKey="id" />
                  </TableHead>
                  <TableHead 
                    className="relative"
                    style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }}
                  >
                    <button 
                      onClick={() => handleSort('name')}
                      className="flex items-center hover:text-gray-900 font-semibold w-full"
                    >
                      Name
                      <SortIcon field="name" />
                    </button>
                    <ResizeHandle columnKey="name" />
                  </TableHead>
                  <TableHead 
                    className="relative"
                    style={{ width: `${columnWidths.email}px`, minWidth: `${columnWidths.email}px` }}
                  >
                    <button 
                      onClick={() => handleSort('email')}
                      className="flex items-center hover:text-gray-900 font-semibold w-full"
                    >
                      Email
                      <SortIcon field="email" />
                    </button>
                    <ResizeHandle columnKey="email" />
                  </TableHead>
                  {columnVisibility.phone && (
                    <TableHead 
                      className="relative"
                      style={{ width: `${columnWidths.phone}px`, minWidth: `${columnWidths.phone}px` }}
                    >
                      <button 
                        onClick={() => handleSort('phone')}
                        className="flex items-center hover:text-gray-900 font-semibold w-full"
                      >
                        Phone
                        <SortIcon field="phone" />
                      </button>
                      <ResizeHandle columnKey="phone" />
                    </TableHead>
                  )}
                  {columnVisibility.company && (
                    <TableHead 
                      className="relative"
                      style={{ width: `${columnWidths.company}px`, minWidth: `${columnWidths.company}px` }}
                    >
                      <button 
                        onClick={() => handleSort('company')}
                        className="flex items-center hover:text-gray-900 font-semibold w-full"
                      >
                        Company
                        <SortIcon field="company" />
                      </button>
                      <ResizeHandle columnKey="company" />
                    </TableHead>
                  )}
                  {columnVisibility.position && (
                    <TableHead 
                      className="relative"
                      style={{ width: `${columnWidths.position}px`, minWidth: `${columnWidths.position}px` }}
                    >
                      <button 
                        onClick={() => handleSort('position')}
                        className="flex items-center hover:text-gray-900 font-semibold w-full"
                      >
                        Position
                        <SortIcon field="position" />
                      </button>
                      <ResizeHandle columnKey="position" />
                    </TableHead>
                  )}
                  {customFields.map(field => {
                    const columnKey = `custom_${field.name}`;
                    const width = columnWidths[columnKey] || 150;
                    return (
                      <TableHead 
                        key={field.id} 
                        className="relative"
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        <button 
                          onClick={() => handleSort(columnKey)}
                          className="flex items-center hover:text-gray-900 font-semibold w-full"
                        >
                          {field.label}
                          <SortIcon field={columnKey} />
                        </button>
                        <ResizeHandle columnKey={columnKey} />
                      </TableHead>
                    );
                  })}
                  {columnVisibility.attendance && (
                    <TableHead 
                      className="relative"
                      style={{ width: `${columnWidths.attendance}px`, minWidth: `${columnWidths.attendance}px` }}
                    >
                      <button 
                        onClick={() => handleSort('attendance')}
                        className="flex items-center hover:text-gray-900 font-semibold w-full"
                      >
                        Attendance
                        <SortIcon field="attendance" />
                      </button>
                      <ResizeHandle columnKey="attendance" />
                    </TableHead>
                  )}
                  {columnVisibility.registered && (
                    <TableHead 
                      className="relative"
                      style={{ width: `${columnWidths.registered}px`, minWidth: `${columnWidths.registered}px` }}
                    >
                      <button 
                        onClick={() => handleSort('registeredAt')}
                        className="flex items-center hover:text-gray-900 font-semibold w-full"
                      >
                        Registered
                        <SortIcon field="registeredAt" />
                      </button>
                      <ResizeHandle columnKey="registered" />
                    </TableHead>
                  )}
                  <TableHead 
                    className="relative"
                    style={{ width: `${columnWidths.emailStatus || 150}px`, minWidth: `${columnWidths.emailStatus || 150}px` }}
                  >
                    <button
                      onClick={() => handleSort('email_status')}
                      className="flex items-center gap-1 font-semibold hover:text-purple-600 transition-colors w-full"
                    >
                      Email Status
                      <SortIcon field="email_status" />
                    </button>
                    <ResizeHandle columnKey="emailStatus" />
                  </TableHead>
                  <TableHead 
                    className="text-right sticky right-0 bg-gray-50 z-10"
                    style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                  >
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {paginatedParticipants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + 
                    (columnVisibility.phone ? 1 : 0) +
                    (columnVisibility.company ? 1 : 0) +
                    (columnVisibility.position ? 1 : 0) +
                    customFields.length +
                    (columnVisibility.attendance ? 1 : 0) +
                    (columnVisibility.registered ? 1 : 0) +
                    1} className="text-center text-muted-foreground">
                    {filteredParticipants.length === 0 ? 'No participants found' : 'No results on this page'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell 
                      className="font-mono text-xs truncate" 
                      title={participant.id}
                      style={{ width: `${columnWidths.id}px`, maxWidth: `${columnWidths.id}px` }}
                    >
                      {participant.id.substring(5, 15)}...
                    </TableCell>
                    <TableCell 
                      className="font-medium truncate"
                      style={{ width: `${columnWidths.name}px`, maxWidth: `${columnWidths.name}px` }}
                    >
                      {participant.name}
                    </TableCell>
                    <TableCell 
                      className="text-sm truncate"
                      style={{ width: `${columnWidths.email}px`, maxWidth: `${columnWidths.email}px` }}
                    >
                      {participant.email}
                    </TableCell>
                    {columnVisibility.phone && (
                      <TableCell 
                        className="truncate"
                        style={{ width: `${columnWidths.phone}px`, maxWidth: `${columnWidths.phone}px` }}
                      >
                        {participant.phone || '-'}
                      </TableCell>
                    )}
                    {columnVisibility.company && (
                      <TableCell 
                        className="truncate"
                        style={{ width: `${columnWidths.company}px`, maxWidth: `${columnWidths.company}px` }}
                      >
                        {participant.company || '-'}
                      </TableCell>
                    )}
                    {columnVisibility.position && (
                      <TableCell 
                        className="truncate"
                        style={{ width: `${columnWidths.position}px`, maxWidth: `${columnWidths.position}px` }}
                      >
                        {participant.position || '-'}
                      </TableCell>
                    )}
                    {customFields.map(field => {
                      const columnKey = `custom_${field.name}`;
                      const width = columnWidths[columnKey] || 150;
                      return (
                        <TableCell 
                          key={field.id}
                          className="truncate"
                          style={{ width: `${width}px`, maxWidth: `${width}px` }}
                        >
                          {participant.customData?.[field.name] || '-'}
                        </TableCell>
                      );
                    })}
                    {columnVisibility.attendance && (
                      <TableCell
                        style={{ width: `${columnWidths.attendance}px`, maxWidth: `${columnWidths.attendance}px` }}
                      >
                        <Badge variant="secondary">
                          {(participant.attendance || []).length} sessions
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.registered && (
                      <TableCell 
                        className="text-sm text-muted-foreground truncate"
                        style={{ width: `${columnWidths.registered}px`, maxWidth: `${columnWidths.registered}px` }}
                      >
                        {new Date(participant.registeredAt).toLocaleDateString()}
                      </TableCell>
                    )}
                    <TableCell 
                      style={{ width: `${columnWidths.emailStatus}px`, maxWidth: `${columnWidths.emailStatus}px` }}
                    >
                      {getEmailStatusBadge(participant)}
                    </TableCell>
                    <TableCell 
                      className="text-right sticky right-0 bg-white border-l z-10"
                      style={{ width: `${columnWidths.actions}px`, maxWidth: `${columnWidths.actions}px` }}
                    >
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSendEmail(participant)}
                          title="Send email"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(participant)}
                          title="Edit participant"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(participant.id)}
                          title="Delete participant"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredParticipants.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredParticipants.length)} of {filteredParticipants.length} participants
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Rows per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Send Email Dialog */}
    <Dialog open={showSendEmailDialog} onOpenChange={setShowSendEmailDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Email to Participant</DialogTitle>
          <DialogDescription>
            Send a personalized email to {selectedParticipant?.name}
          </DialogDescription>
        </DialogHeader>
        
        {!isSendingEmail ? (
          <div className="space-y-4">
            {/* Participant Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <span className="text-sm font-semibold text-gray-700">To:</span>
                <span className="text-sm text-gray-900 ml-2">{selectedParticipant?.name}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-700">Email:</span>
                <span className="text-sm text-gray-900 ml-2">{selectedParticipant?.email}</span>
              </div>
              {selectedParticipant?.email_send_count && selectedParticipant?.email_send_count > 0 && (
                <div className="text-sm text-gray-600">
                  📧 {selectedParticipant?.email_send_count} email(s) previously sent
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Select Email Template</Label>
              <div className="relative">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-full overflow-hidden">
                    <SelectValue placeholder="Choose a template...">
                      {selectedTemplateId && emailTemplates.length > 0 && (
                        <span className="truncate block">
                          {emailTemplates.find(t => t.id === selectedTemplateId)?.name || 'Selected template'}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-[600px]">
                    {emailTemplates.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No templates available
                      </SelectItem>
                    ) : (
                      emailTemplates.map((template) => (
                        <SelectItem 
                          key={template.id} 
                          value={template.id}
                        >
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {emailTemplates.length === 0 && (
                <p className="text-xs text-gray-600">
                  Create email templates in the Email Templates tab first
                </p>
              )}
            </div>

            {/* Preview Info */}
            {selectedTemplateId && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-sm text-blue-900">
                  📝 Placeholders like &#123;&#123;name&#125;&#125;, &#123;&#123;email&#125;&#125;, &#123;&#123;company&#125;&#125; will be replaced with participant data
                </AlertDescription>
              </Alert>
            )}

            {/* Warning */}
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-sm text-amber-900">
                ⚠️ <strong>Simulation Mode:</strong> Email preview will be shown in console. 
                Configure email service (SendGrid/AWS SES) to actually send emails.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                onClick={() => {
                  setShowSendEmailDialog(false);
                  setSelectedParticipant(null);
                  setSelectedTemplateId('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                className="gradient-primary"
                disabled={!selectedTemplateId || emailTemplates.length === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
            <p className="mt-4 text-gray-700">Sending email...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
