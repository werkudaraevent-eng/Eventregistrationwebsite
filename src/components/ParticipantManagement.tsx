import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TableBody, TableCell, TableHead, TableRow } from './ui/table';
import { Card, CardContent, CardHeader } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Search, Trash2, Download, Users, Plus, Upload, Link2, Edit, ArrowUpDown, ArrowUp, ArrowDown, Mail, Send, Filter, X, Printer } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { ColumnManagement } from './ColumnManagement';
import { supabase } from '../utils/supabase/client';
import { createParticipant } from '../utils/supabaseDataLayer';
import { DEFAULT_PRINT_CONFIG } from '../utils/localDBStub';
import type { PaperSizeConfiguration } from '../utils/localDBStub';
import { BadgePrintView } from './BadgePrintView';
import { BadgeTemplateSelector, type BadgeTemplate, loadBadgeTemplates } from './BadgeTemplateSelector';
import QRCodeLib from 'qrcode';

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
  qr_code_url?: string;
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
  emailStatus: boolean;
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
    registered: true,
    emailStatus: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced column filters - staging vs applied
  const [stagingFilters, setStagingFilters] = useState<Array<{
    id: string;
    column: string;
    operator: 'contains' | 'equals' | 'starts-with' | 'ends-with' | 'not-empty' | 'empty';
    value: string;
  }>>([]);
  const [columnFilters, setColumnFilters] = useState<Array<{
    id: string;
    column: string;
    operator: 'contains' | 'equals' | 'starts-with' | 'ends-with' | 'not-empty' | 'empty';
    value: string;
  }>>([]);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Email confirmation for new participants
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(false);
  
  // Selection states
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = useState(false);
  const [bulkEmailTemplateId, setBulkEmailTemplateId] = useState<string>('');
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);
  
  // Print configuration state
  const [printConfig, setPrintConfig] = useState<PaperSizeConfiguration>(DEFAULT_PRINT_CONFIG);
  const [badgeDimensions, setBadgeDimensions] = useState({ width: 85.6, height: 53.98 }); // CR80 default
  const [badgeTemplate, setBadgeTemplate] = useState<any>(null);
  const [eventName, setEventName] = useState<string>('');
  
  // Badge template selection
  const [availableTemplates, setAvailableTemplates] = useState<BadgeTemplate[]>([]);
  const [selectedBadgeTemplate, setSelectedBadgeTemplate] = useState<BadgeTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('registeredAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Column resize states - Optimized for better UX
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    id: 100,
    name: 150,
    email: 180,
    phone: 120,
    company: 140,
    position: 130,
    attendance: 160,
    registered: 100,
    emailStatus: 140,
    actions: 140
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
  
  // Email campaigns tracking
  const [participantCampaigns, setParticipantCampaigns] = useState<Record<string, string[]>>({});
  
  // Seat assignments - maps participant_id to seat info
  const [seatAssignments, setSeatAssignments] = useState<Record<string, { tableName: string; seatNumber: number; tableId: string; assignmentId: string }>>({});
  const [availableTables, setAvailableTables] = useState<Array<{ id: string; name: string; capacity: number; layoutId: string }>>([]);
  const [tableOccupancy, setTableOccupancy] = useState<Record<string, number>>({}); // tableId -> occupied count
  const [showSeatAssignDialog, setShowSeatAssignDialog] = useState(false);
  const [seatAssignParticipant, setSeatAssignParticipant] = useState<Participant | null>(null);
  const [availableSeatsForTable, setAvailableSeatsForTable] = useState<Array<{ seatNumber: number; isOccupied: boolean; occupantName?: string }>>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [quickAssignTableId, setQuickAssignTableId] = useState<string>('');
  const [quickAssignSeatNumber, setQuickAssignSeatNumber] = useState<number>(0);
  const [isAssigningSeat, setIsAssigningSeat] = useState(false);
  
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
    customData: {} as Record<string, any>,
    selectedSeatTableId: '' as string,
    selectedSeatNumber: 0 as number
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
        customData: p.customData || {},
        qr_code_url: p.qr_code_url || p.qrCodeUrl // Support both snake_case and camelCase
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

  // Fetch seat assignments for all participants
  const fetchSeatAssignments = async () => {
    try {
      // First get all layouts for this event
      const { data: layouts } = await supabase
        .from('seating_layouts')
        .select('id')
        .eq('event_id', eventId);
      
      if (!layouts || layouts.length === 0) return;

      // Get all tables for these layouts
      const layoutIds = layouts.map(l => l.id);
      const { data: tables } = await supabase
        .from('seating_tables')
        .select('id, name, layout_id, capacity')
        .in('layout_id', layoutIds);
      
      if (!tables || tables.length === 0) return;

      // Get all seat assignments
      const tableIds = tables.map(t => t.id);
      const { data: assignments } = await supabase
        .from('seat_assignments')
        .select('participant_id, table_id, seat_number')
        .in('table_id', tableIds)
        .not('participant_id', 'is', null);

      if (!assignments) return;

      // Build lookup map with full info and count occupancy per table
      const seatMap: Record<string, { tableName: string; seatNumber: number; tableId: string; assignmentId: string }> = {};
      const occupancyCount: Record<string, number> = {};
      
      // Initialize occupancy count for all tables
      tables.forEach(t => { occupancyCount[t.id] = 0; });
      
      assignments.forEach((a: any) => {
        if (a.participant_id) {
          const table = tables.find(t => t.id === a.table_id);
          if (table) {
            seatMap[a.participant_id] = {
              tableName: table.name,
              seatNumber: a.seat_number,
              tableId: a.table_id,
              assignmentId: a.id || ''
            };
            // Count occupied seats per table
            occupancyCount[a.table_id] = (occupancyCount[a.table_id] || 0) + 1;
          }
        }
      });
      
      setSeatAssignments(seatMap);
      setTableOccupancy(occupancyCount);
      
      // Also store available tables for assignment
      setAvailableTables(tables.map((t: any) => ({
        id: t.id,
        name: t.name,
        capacity: t.capacity || 10,
        layoutId: t.layout_id
      })));
    } catch (error) {
      console.error('Error fetching seat assignments:', error);
    }
  };

  // Fetch available seats for a specific table
  const fetchSeatsForTable = async (tableId: string) => {
    if (!tableId) {
      setAvailableSeatsForTable([]);
      return;
    }
    
    setIsLoadingSeats(true);
    try {
      // Get table info
      const { data: tableData } = await supabase
        .from('seating_tables')
        .select('capacity')
        .eq('id', tableId)
        .single();
      
      const capacity = tableData?.capacity || 10;
      
      // Get all seat assignments for this table
      const { data: assignments } = await supabase
        .from('seat_assignments')
        .select('seat_number, participant_id')
        .eq('table_id', tableId);
      
      // Get participant names for occupied seats
      const occupiedSeats: Record<number, string> = {};
      if (assignments) {
        const participantIds = assignments.filter(a => a.participant_id).map(a => a.participant_id);
        if (participantIds.length > 0) {
          const { data: participantData } = await supabase
            .from('participants')
            .select('id, name')
            .in('id', participantIds);
          
          const nameMap: Record<string, string> = {};
          participantData?.forEach(p => { nameMap[p.id] = p.name; });
          
          assignments.forEach(a => {
            if (a.participant_id) {
              occupiedSeats[a.seat_number] = nameMap[a.participant_id] || 'Occupied';
            }
          });
        }
      }
      
      // Build seats array
      const seats = [];
      for (let i = 1; i <= capacity; i++) {
        seats.push({
          seatNumber: i,
          isOccupied: !!occupiedSeats[i],
          occupantName: occupiedSeats[i]
        });
      }
      
      setAvailableSeatsForTable(seats);
    } catch (error) {
      console.error('Error fetching seats for table:', error);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  // Handle quick seat assignment
  const handleQuickSeatAssign = async () => {
    if (!seatAssignParticipant || !quickAssignTableId || quickAssignSeatNumber <= 0) return;
    
    setIsAssigningSeat(true);
    try {
      // Remove old assignment if exists
      const currentSeat = seatAssignments[seatAssignParticipant.id];
      if (currentSeat) {
        await supabase
          .from('seat_assignments')
          .update({ participant_id: null })
          .eq('table_id', currentSeat.tableId)
          .eq('seat_number', currentSeat.seatNumber);
      }
      
      // Check if seat assignment row exists
      const { data: existingSeat } = await supabase
        .from('seat_assignments')
        .select('id')
        .eq('table_id', quickAssignTableId)
        .eq('seat_number', quickAssignSeatNumber)
        .single();
      
      if (existingSeat) {
        // Update existing row
        await supabase
          .from('seat_assignments')
          .update({ participant_id: seatAssignParticipant.id })
          .eq('table_id', quickAssignTableId)
          .eq('seat_number', quickAssignSeatNumber);
      } else {
        // Insert new row
        await supabase
          .from('seat_assignments')
          .insert({
            table_id: quickAssignTableId,
            seat_number: quickAssignSeatNumber,
            participant_id: seatAssignParticipant.id
          });
      }
      
      // Refresh seat assignments
      await fetchSeatAssignments();
      
      // Close dialog and reset
      setShowSeatAssignDialog(false);
      setSeatAssignParticipant(null);
      setQuickAssignTableId('');
      setQuickAssignSeatNumber(0);
      setAvailableSeatsForTable([]);
    } catch (error) {
      console.error('Error assigning seat:', error);
    } finally {
      setIsAssigningSeat(false);
    }
  };

  // Handle removing seat assignment
  const handleRemoveSeatAssignment = async () => {
    if (!seatAssignParticipant) return;
    
    const currentSeat = seatAssignments[seatAssignParticipant.id];
    if (!currentSeat) return;
    
    setIsAssigningSeat(true);
    try {
      await supabase
        .from('seat_assignments')
        .update({ participant_id: null })
        .eq('table_id', currentSeat.tableId)
        .eq('seat_number', currentSeat.seatNumber);
      
      await fetchSeatAssignments();
      
      setShowSeatAssignDialog(false);
      setSeatAssignParticipant(null);
      setQuickAssignTableId('');
      setQuickAssignSeatNumber(0);
    } catch (error) {
      console.error('Error removing seat assignment:', error);
    } finally {
      setIsAssigningSeat(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    loadColumnSettings();
    loadEmailTemplates();
    loadPrintConfiguration();
    fetchSeatAssignments();
  }, [eventId, accessToken]);

  useEffect(() => {
    if (participants.length > 0) {
      fetchParticipantCampaigns();
    }
  }, [participants]);

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
    let filtered = participants;
    
    // Global search across all fields
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        // Search in basic fields
        const basicMatch = 
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          (p.company || '').toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) ||
          (p.phone || '').toLowerCase().includes(query) ||
          (p.position || '').toLowerCase().includes(query);
        
        // Search in custom fields
        const customMatch = customFields.some(field => {
          // Try both field.id (new format) and field.name (legacy format)
          const value = p.customData?.[field.id] || p.customData?.[field.name];
          return value && String(value).toLowerCase().includes(query);
        });
        
        // Search in attendance session names
        const attendanceMatch = (p.attendance || []).some(record => 
          (record.agendaItem || '').toLowerCase().includes(query)
        );
        
        // Search in campaign names (remove "(pending)" suffix for matching)
        const campaignMatch = (participantCampaigns[p.id] || []).some(campaign => {
          const cleanName = campaign.replace(/\s*\(pending\)\s*$/i, '').toLowerCase();
          return cleanName.includes(query) || campaign.toLowerCase().includes(query);
        });
        
        return basicMatch || customMatch || attendanceMatch || campaignMatch;
      });
    }
    
    // Apply column-specific filters
    columnFilters.forEach(filter => {
      filtered = filtered.filter(p => {
        let value: any;
        
        // Get value based on column type
        if (filter.column.startsWith('custom_')) {
          const fieldName = filter.column.replace('custom_', '');
          // Find the field to get its ID
          const field = customFields.find(f => f.name === fieldName);
          // Try both field.id (new format) and fieldName (legacy format)
          value = field ? (p.customData?.[field.id] || p.customData?.[fieldName] || '') : '';
        } else if (filter.column === 'attendance') {
          // For attendance, search in session names (agendaItem), not just count
          const attendanceRecords = p.attendance || [];
          
          // Handle special operators
          if (filter.operator === 'not-empty') {
            return attendanceRecords.length > 0;
          }
          if (filter.operator === 'empty') {
            return attendanceRecords.length === 0;
          }
          
          // Search in session names
          const sessionNames = attendanceRecords.map(r => r.agendaItem || '').join(' ').toLowerCase();
          const filterValue = filter.value.toLowerCase();
          
          switch (filter.operator) {
            case 'contains':
              return sessionNames.includes(filterValue);
            case 'equals':
              return attendanceRecords.some(r => (r.agendaItem || '').toLowerCase() === filterValue);
            case 'starts-with':
              return attendanceRecords.some(r => (r.agendaItem || '').toLowerCase().startsWith(filterValue));
            case 'ends-with':
              return attendanceRecords.some(r => (r.agendaItem || '').toLowerCase().endsWith(filterValue));
            default:
              return true;
          }
        } else if (filter.column === 'campaigns') {
          // For campaigns, search in campaign names, not just count
          const campaigns = participantCampaigns[p.id] || [];
          
          // Handle special operators
          if (filter.operator === 'not-empty') {
            return campaigns.length > 0;
          }
          if (filter.operator === 'empty') {
            return campaigns.length === 0;
          }
          
          // Search in campaign names (also match campaigns with "(pending)" suffix)
          // Remove "(pending)" from campaign names for comparison
          const cleanCampaignNames = campaigns.map(c => c.replace(/\s*\(pending\)\s*$/i, '')).join(' ').toLowerCase();
          const filterValue = filter.value.toLowerCase();
          
          switch (filter.operator) {
            case 'contains':
              return cleanCampaignNames.includes(filterValue);
            case 'equals':
              return campaigns.some(c => {
                const cleanName = c.replace(/\s*\(pending\)\s*$/i, '').toLowerCase();
                return cleanName === filterValue;
              });
            case 'starts-with':
              return campaigns.some(c => {
                const cleanName = c.replace(/\s*\(pending\)\s*$/i, '').toLowerCase();
                return cleanName.startsWith(filterValue);
              });
            case 'ends-with':
              return campaigns.some(c => {
                const cleanName = c.replace(/\s*\(pending\)\s*$/i, '').toLowerCase();
                return cleanName.endsWith(filterValue);
              });
            default:
              return true;
          }
        } else {
          value = (p as any)[filter.column] || '';
        }
        
        const strValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();
        
        // Apply operator
        switch (filter.operator) {
          case 'contains':
            return strValue.includes(filterValue);
          case 'equals':
            return strValue === filterValue;
          case 'starts-with':
            return strValue.startsWith(filterValue);
          case 'ends-with':
            return strValue.endsWith(filterValue);
          case 'not-empty':
            return strValue.trim() !== '';
          case 'empty':
            return strValue.trim() === '';
          default:
            return true;
        }
      });
    });
    
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
        // Find the field to get its ID
        const field = customFields.find(f => f.name === fieldName);
        // Try both field.id (new format) and fieldName (legacy format)
        aValue = field ? (a.customData?.[field.id] || a.customData?.[fieldName] || '') : '';
        bValue = field ? (b.customData?.[field.id] || b.customData?.[fieldName] || '') : '';
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
    setCurrentPage(1); // Reset to first page when search/filter changes
  }, [searchQuery, participants, sortField, sortDirection, columnFilters, participantCampaigns, customFields]);

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

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedParticipants.map(p => p.id));
      setSelectedParticipantIds(allIds);
    } else {
      setSelectedParticipantIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedParticipantIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedParticipantIds(newSelection);
  };

  const isAllSelected = paginatedParticipants.length > 0 && 
    paginatedParticipants.every(p => selectedParticipantIds.has(p.id));
  
  const isSomeSelected = paginatedParticipants.some(p => selectedParticipantIds.has(p.id)) && !isAllSelected;

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

  // Load print configuration from badge template
  const loadPrintConfiguration = async () => {
    try {
      // Load available badge templates
      const templates = await loadBadgeTemplates(eventId);
      setAvailableTemplates(templates);
      
      // Auto-select default template if available
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        handleTemplateSelect(defaultTemplate);
      }

      const { data, error } = await supabase
        .from('events')
        .select('badge_template, name')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error loading print configuration:', error);
        return;
      }

      if (data) {
        // Set event name
        setEventName(data.name || '');

        // If no templates in new table, use legacy template from events table
        if (templates.length === 0 && data.badge_template) {
          const template = data.badge_template;
          
          // Store full badge template
          setBadgeTemplate(template);
          
          // Load print configuration if exists
          if (template.printConfiguration) {
            setPrintConfig(template.printConfiguration);
          }

          // Load badge dimensions
          if (template.size) {
            const BADGE_SIZES: Record<string, { width: number; height: number }> = {
              CR80: { width: 85.6, height: 53.98 },
              A6: { width: 105, height: 148 },
              A7: { width: 74, height: 105 },
              custom: { width: template.customWidth || 100, height: template.customHeight || 150 }
            };
            
            const size = BADGE_SIZES[template.size] || BADGE_SIZES.CR80;
            setBadgeDimensions(size);
          }
        }
      }
    } catch (error) {
      console.error('Error loading print configuration:', error);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: BadgeTemplate | null) => {
    setSelectedBadgeTemplate(template);
    
    if (template) {
      const data = template.template_data;
      setBadgeTemplate(data);
      
      if (data.printConfiguration) {
        setPrintConfig(data.printConfiguration);
      }
      
      if (data.size) {
        const BADGE_SIZES: Record<string, { width: number; height: number }> = {
          CR80: { width: 85.6, height: 53.98 },
          A6: { width: 105, height: 148 },
          A7: { width: 74, height: 105 },
          B1: { width: 55, height: 85 },
          B2: { width: 65, height: 105 },
          B3: { width: 80, height: 105 },
          B4: { width: 90, height: 130 },
          A1: { width: 55, height: 90 },
          A2: { width: 65, height: 95 },
          A3: { width: 80, height: 100 },
          custom: { width: data.customWidth || 100, height: data.customHeight || 150 }
        };
        
        const size = BADGE_SIZES[data.size] || BADGE_SIZES.CR80;
        setBadgeDimensions(size);
      }
    }
  };

  // Handle print badges for selected participants
  const handlePrintBadges = async () => {
    if (selectedParticipantIds.size === 0) {
      alert('Please select at least one participant to print badges');
      return;
    }

    if (!badgeTemplate && !selectedBadgeTemplate) {
      alert('Please select a badge template first');
      return;
    }

    const template = badgeTemplate;
    if (!template) {
      alert('No badge template available');
      return;
    }

    try {
      // Get selected participants
      const selectedParticipants = Array.from(selectedParticipantIds)
        .map(id => participants.find(p => p.id === id))
        .filter(Boolean) as Participant[];

      if (selectedParticipants.length === 0) {
        alert('No participants selected');
        return;
      }

      // Open new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to print badges');
        return;
      }

      // Generate QR codes for all participants
      const qrCodes: Record<string, string> = {};
      for (const participant of selectedParticipants) {
        try {
          const qrData = participant.qr_code_url || participant.id;
          qrCodes[participant.id] = await QRCodeLib.toDataURL(qrData, {
            width: 200,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          });
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      }

      // Build badges HTML
      let badgesHtml = '';
      const components = template.components || [];

      for (const participant of selectedParticipants) {
        let componentsHtml = '';
        
        for (const comp of components) {
          if (!comp.enabled) continue;

          const style = `
            position: absolute;
            left: ${comp.x}%;
            top: ${comp.y}%;
            width: ${comp.width}%;
            height: ${comp.height}%;
            font-size: ${comp.fontSize || 16}px;
            font-family: ${comp.fontFamily || 'sans-serif'};
            font-weight: ${comp.fontWeight || 'normal'};
            font-style: ${comp.fontStyle || 'normal'};
            text-align: ${comp.textAlign || 'center'};
            color: ${comp.color || '#000000'};
            display: flex;
            align-items: center;
            justify-content: ${comp.textAlign === 'left' ? 'flex-start' : comp.textAlign === 'right' ? 'flex-end' : 'center'};
            overflow: hidden;
          `;

          let content = '';
          switch (comp.type) {
            case 'field':
              const fieldValue = comp.fieldName === 'name' ? participant.name
                : comp.fieldName === 'email' ? participant.email
                : comp.fieldName === 'phone' ? participant.phone
                : comp.fieldName === 'company' ? participant.company
                : comp.fieldName === 'position' ? participant.position
                : (participant.customData?.[comp.fieldName || '']) || comp.label || '';
              content = `<span>${fieldValue}</span>`;
              break;
            case 'qrcode':
              content = qrCodes[participant.id] ? `<img src="${qrCodes[participant.id]}" style="width: 100%; height: 100%; object-fit: contain;" />` : '';
              break;
            case 'eventName':
              content = `<span>${eventName}</span>`;
              break;
            case 'customText':
              content = `<span>${comp.customText || comp.label || ''}</span>`;
              break;
            case 'logo':
              if (template.logoUrl) {
                content = `<img src="${template.logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" />`;
              }
              break;
          }

          componentsHtml += `<div style="${style}">${content}</div>`;
        }

        badgesHtml += `
          <div class="badge">
            ${componentsHtml}
          </div>
        `;
      }

      // Create print HTML
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Badges - ${eventName}</title>
          <style>
            @page {
              size: ${badgeDimensions.width}mm ${badgeDimensions.height}mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .badge {
              width: ${badgeDimensions.width}mm;
              height: ${badgeDimensions.height}mm;
              position: relative;
              background-color: ${template.backgroundColor || '#ffffff'};
              ${template.backgroundImageUrl ? `background-image: url('${template.backgroundImageUrl}'); background-size: ${template.backgroundImageFit || 'cover'}; background-position: center;` : ''}
              overflow: hidden;
              page-break-after: always;
            }
            .badge:last-child {
              page-break-after: auto;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${badgesHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printHtml);
      printWindow.document.close();

    } catch (error) {
      console.error('Error printing badges:', error);
      alert('An unexpected error occurred while printing. Please try again.');
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
      let personalizedBody = replacePlaceholders(template.body);

      console.log('=== SENDING EMAIL ===');
      console.log('To:', selectedParticipant.email);
      console.log('Subject:', personalizedSubject);

      // Prepare attachments array (URLs only)
      let emailAttachments = template.attachments || [];

      console.log('[ParticipantManagement] 🔍 Checking QR code:', {
        templateIncludeQR: template.include_qr_code,
        participantQRUrl: selectedParticipant.qr_code_url,
        participantId: selectedParticipant.id,
        participantEmail: selectedParticipant.email
      });

      // Add participant QR code from database if template requires it
      if (template.include_qr_code && selectedParticipant.qr_code_url) {
        console.log('[ParticipantManagement] ✅ Adding QR code from database:', selectedParticipant.qr_code_url);
        emailAttachments = [
          ...emailAttachments,
          selectedParticipant.qr_code_url
        ];
      } else if (template.include_qr_code && !selectedParticipant.qr_code_url) {
        console.warn('[ParticipantManagement] ⚠️ QR code requested but not found in participant data for:', selectedParticipant.id);
      }

      console.log('[ParticipantManagement] 📧 Sending email with params:', {
        to: selectedParticipant.email,
        participantId: selectedParticipant.id,
        templateId: template.id,
        attachmentsArray: emailAttachments,
        attachmentsCount: emailAttachments?.length || 0,
        includeQR: template.include_qr_code
      });

      // Create email log first to get tracking ID
      const { data: emailLogData, error: logCreateError } = await supabase
        .from('participant_emails')
        .insert({
          participant_id: selectedParticipant.id,
          template_id: template.id,
          template_name: template.name,
          subject: personalizedSubject,
          status: 'pending'
        })
        .select()
        .single();

      let emailLogId = emailLogData?.id;

      // Add tracking pixel if email log created successfully
      if (emailLogId) {
        const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
        
        // Method 1: Tracking pixel (may be blocked by Gmail)
        const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email?id=${emailLogId}&pid=${selectedParticipant.id}" width="1" height="1" style="display:none;" alt="" />`;
        
        // Method 2: Add tracking to any existing links (more reliable)
        // Wrap any http/https links with tracking
        let bodyWithTracking = personalizedBody;
        
        // Find all clickable links and add tracking parameter
        const linkRegex = /(https?:\/\/[^\s<>"]+)/gi;
        bodyWithTracking = bodyWithTracking.replace(linkRegex, (match) => {
          // Add tracking parameter to links
          const separator = match.includes('?') ? '&' : '?';
          return `${match}${separator}_track=${emailLogId}`;
        });
        
        // Add tracking pixel at the end
        bodyWithTracking = bodyWithTracking + trackingPixel;
        
        console.log('[ParticipantManagement] ✅ Dual tracking added (pixel + links)');
        console.log('[ParticipantManagement] 📍 Tracking URL:', `${supabaseUrl}/functions/v1/track-email?id=${emailLogId}&pid=${selectedParticipant.id}`);
        console.log('[ParticipantManagement] 📧 Email Log ID:', emailLogId);
        
        personalizedBody = bodyWithTracking;
      }

      // Send email via Supabase Edge Function with timeout
      console.log('[ParticipantManagement] 🚀 Invoking send-email function...');
      
      const sendEmailPromise = supabase.functions.invoke('send-email', {
        body: {
          to: selectedParticipant.email,
          subject: personalizedSubject,
          html: personalizedBody,
          participantId: selectedParticipant.id,
          templateId: template.id,
          attachments: emailAttachments
        }
      });

      // Add 30 second timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000)
      );

      const { data, error: sendError } = await Promise.race([
        sendEmailPromise,
        timeoutPromise
      ]) as any;

      if (sendError) {
        console.error('❌ Failed to send email:', sendError);
        
        // Update email log to failed
        if (emailLogId) {
          await supabase.from('participant_emails')
            .update({
              status: 'failed',
              error_message: sendError.message || 'Failed to send email'
            })
            .eq('id', emailLogId);
        }

        alert(`❌ Failed to send email to ${selectedParticipant.name}\n\nError: ${sendError.message}`);
        return;
      }

      console.log('✅ Email sent successfully:', data);

      // Update email log to sent
      if (emailLogId) {
        await supabase.from('participant_emails')
          .update({ status: 'sent' })
          .eq('id', emailLogId);
        console.log('[ParticipantManagement] ✅ Email log updated to sent');
      }

      // Refresh participants to show updated status
      await fetchParticipants();
      
      // Refresh campaigns
      await fetchParticipantCampaigns();

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

  // Fetch email campaigns for all participants
  const fetchParticipantCampaigns = async () => {
    try {
      const participantIds = participants.map(p => p.id);
      if (participantIds.length === 0) return;

      console.log('[ParticipantCampaigns] Fetching for participant IDs:', participantIds.length);

      // Get all email logs for these participants (including failed)
      const { data: emailLogs, error: emailLogsError } = await supabase
        .from('participant_emails')
        .select('participant_id, campaign_id, status')
        .in('participant_id', participantIds);

      if (emailLogsError) {
        console.error('[ParticipantCampaigns] Error fetching email logs:', emailLogsError);
        return;
      }

      console.log('[ParticipantCampaigns] Email logs fetched:', emailLogs?.length);

      // Get unique campaign IDs from logs
      const campaignIds = [...new Set(emailLogs?.map(log => log.campaign_id).filter(Boolean))] as string[];
      console.log('[ParticipantCampaigns] Unique campaign IDs:', campaignIds);

      // Fetch campaign names
      let campaignNamesMap: Record<string, string> = {};
      
      if (campaignIds.length > 0) {
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, name')
          .in('id', campaignIds);

        if (campaignsError) {
          console.error('[ParticipantCampaigns] Error fetching campaigns:', campaignsError);
          return;
        }

        console.log('[ParticipantCampaigns] Campaigns fetched:', campaigns?.length);

        campaigns?.forEach(campaign => {
          campaignNamesMap[campaign.id] = campaign.name;
        });
      }

      // Build mapping from participant_id to campaigns
      const campaignsByParticipant: Record<string, string[]> = {};

      emailLogs?.forEach(log => {
        if (!log.campaign_id) return;

        if (!campaignsByParticipant[log.participant_id]) {
          campaignsByParticipant[log.participant_id] = [];
        }

        const campaignName = campaignNamesMap[log.campaign_id] || `Campaign ${log.campaign_id.substring(0, 8)}`;
        
        // Add status suffix based on email status
        let displayName = campaignName;
        if (log.status === 'pending' || log.status === 'queued' || log.status === 'scheduled') {
          displayName = `${campaignName} (pending)`;
        } else if (log.status === 'failed') {
          displayName = `${campaignName} (failed)`;
        }
        // sent/delivered/opened: no suffix

        // Add unique campaign names only
        if (!campaignsByParticipant[log.participant_id].includes(displayName)) {
          campaignsByParticipant[log.participant_id].push(displayName);
        }
      });

      setParticipantCampaigns(campaignsByParticipant);
      console.log('[ParticipantCampaigns] Final campaigns by participant:', campaignsByParticipant);
    } catch (error) {
      console.error('[ParticipantCampaigns] Error:', error);
    }
  };

  // Get email campaign tags for participant
  const getEmailCampaignTags = (participant: Participant) => {
    const campaigns = participantCampaigns[participant.id] || [];
    
    if (campaigns.length === 0) {
      return (
        <Badge className="bg-gray-100 text-gray-500 border-gray-300 border text-xs">
          No campaigns
        </Badge>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {campaigns.map((campaign, index) => {
          // Determine badge color based on status
          const isPending = campaign.includes('(pending)') || campaign.includes('(not sent)');
          const isFailed = campaign.includes('(failed)');
          
          let badgeClass = "bg-blue-100 text-blue-700 border-blue-300 border text-xs"; // Default: sent/delivered
          let tooltipText = "Email terkirim";
          
          if (isPending) {
            badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-300 border text-xs";
            tooltipText = campaign.includes('(not sent)') ? "Terdaftar di campaign, email belum dikirim" : "Email dalam antrian (pending)";
          } else if (isFailed) {
            badgeClass = "bg-red-100 text-red-700 border-red-300 border text-xs";
            tooltipText = "Email gagal terkirim";
          }
          
          return (
            <Badge 
              key={index}
              className={badgeClass}
              title={tooltipText}
            >
              {campaign}
            </Badge>
          );
        })}
      </div>
    );
  };

  // Get attendance session tags for participant
  const getAttendanceTags = (participant: Participant) => {
    const attendanceRecords = participant.attendance || [];
    
    if (attendanceRecords.length === 0) {
      return (
        <Badge className="bg-gray-100 text-gray-500 border-gray-300 border text-xs">
          0 sessions
        </Badge>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {attendanceRecords.map((record, index) => {
          // agendaItem contains the session title/name directly, not an ID
          const sessionName = record.agendaItem || 'Unknown Session';
          const timestamp = new Date(record.timestamp).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          return (
            <Badge 
              key={index}
              className="bg-green-100 text-green-700 border-green-300 border text-xs"
              title={`Checked in at ${timestamp}`}
            >
              {sessionName}
            </Badge>
          );
        })}
      </div>
    );
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);

    // Safety timeout to prevent infinite loading state
    const safetyTimeout = setTimeout(() => {
      console.warn('[ParticipantManagement] Add timeout - resetting state');
      setIsSubmitting(false);
      alert('Request timed out. Please try again.');
    }, 30000);

    try {
      console.log('[SUPABASE] Adding participant:', formData);
      
      // Use createParticipant from supabaseDataLayer which includes QR generation
      const newParticipant = await createParticipant({
        eventId: eventId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        company: formData.company || '',
        position: formData.position || '',
        customData: formData.customData || {}
      });
      
      // Clear timeout immediately after successful creation to prevent race condition
      clearTimeout(safetyTimeout);
      
      console.log('[SUPABASE] Participant added successfully with QR:', newParticipant);
      
      // Send confirmation email if enabled
      if (sendConfirmationEmail && selectedTemplateId) {
        try {
          // Fetch template
          const { data: template, error: templateError } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', selectedTemplateId)
            .single();

          if (templateError || !template) {
            console.error('[EMAIL] Template fetch error:', templateError);
            alert(`Participant added, but template not found`);
          } else {
            // Personalize template
            const personalizedSubject = template.subject
              .replace(/\{\{name\}\}/g, formData.name)
              .replace(/\{\{email\}\}/g, formData.email);
            
            const personalizedBody = template.body
              .replace(/\{\{name\}\}/g, formData.name)
              .replace(/\{\{email\}\}/g, formData.email)
              .replace(/\{\{participant_id\}\}/g, newParticipant.id);

            // Prepare attachments
            let emailAttachments: string[] = template.attachments || [];
            if (template.include_qr_code && newParticipant.qr_code_url) {
              emailAttachments = [...emailAttachments, newParticipant.qr_code_url];
            }

            // Send email
            const { error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                to: formData.email,
                subject: personalizedSubject,
                html: personalizedBody,
                participantId: newParticipant.id,
                templateId: template.id,
                attachments: emailAttachments
              }
            });

            // Log to participant_emails
            const emailStatus = emailError ? 'failed' : 'sent';
            await supabase.from('participant_emails').insert({
              participant_id: newParticipant.id,
              template_id: template.id,
              template_name: template.name,
              subject: personalizedSubject,
              status: emailStatus,
              error_message: emailError ? JSON.stringify(emailError) : null
            });

            if (emailError) {
              console.error('[EMAIL] Confirmation send error:', emailError);
              alert(`Participant added, but email failed to send: ${emailError.message}`);
            } else {
              console.log('[EMAIL] Confirmation sent to:', formData.email);
              alert('Participant added successfully and confirmation email sent!');
            }
          }
        } catch (emailErr: any) {
          console.error('[EMAIL] Error:', emailErr);
          alert(`Participant added, but email error: ${emailErr.message}`);
        }
      } else {
        alert('Participant added successfully!');
      }
      
      setFormData({ name: '', email: '', phone: '', company: '', position: '', customData: {}, selectedSeatTableId: '', selectedSeatNumber: 0 });
      setSendConfirmationEmail(false);
      setSelectedTemplateId('');
      setIsAddDialogOpen(false);
      
      // Refresh in background (don't await to speed up UI)
      fetchParticipants().catch(console.error);
      
      // Realtime subscription will handle UI updates automatically
    } catch (err: any) {
      clearTimeout(safetyTimeout);
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

      // Parse CSV with proper handling of quoted values
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
      
      // Standard fields mapping
      const standardFields = ['name', 'email', 'phone', 'company', 'position'];
      
      // Build custom field mapping from event's customFields
      const customFieldMap: Record<string, string> = {};
      customFields.forEach(field => {
        // Match by label (case-insensitive) or by field name/id
        const labelLower = field.label.toLowerCase();
        const nameLower = field.name.toLowerCase();
        customFieldMap[labelLower] = field.id;
        customFieldMap[nameLower] = field.id;
      });

      const participantsToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, '').trim());
        const participant: any = {
          id: `prt-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
          eventId: eventId,
          registeredAt: new Date().toISOString(),
          attendance: [],
          customData: {}
        };

        headers.forEach((header, index) => {
          const headerLower = header.toLowerCase();
          const value = values[index] || '';
          
          // Check standard fields first
          if (headerLower === 'name') {
            participant.name = value;
          } else if (headerLower === 'email') {
            participant.email = value;
          } else if (headerLower === 'phone') {
            participant.phone = value;
          } else if (headerLower === 'company') {
            participant.company = value;
          } else if (headerLower === 'position') {
            participant.position = value;
          } else if (!standardFields.includes(headerLower) && value) {
            // This is a custom field - try to match with existing custom fields
            const fieldId = customFieldMap[headerLower];
            if (fieldId) {
              // Matched with existing custom field
              participant.customData[fieldId] = value;
            } else {
              // Store with header name as key (for fields not yet defined)
              participant.customData[header] = value;
            }
          }
        });

        if (participant.name && participant.email) {
          participantsToImport.push(participant);
        }
      }
      
      console.log('[CSV Import] Headers found:', headers);
      console.log('[CSV Import] Custom fields in event:', customFields.map(f => f.label));
      console.log('[CSV Import] Sample participant:', participantsToImport[0]);

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
    const seatInfo = seatAssignments[participant.id];
    setFormData({
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      company: participant.company,
      position: participant.position,
      customData: participant.customData || {},
      selectedSeatTableId: seatInfo?.tableId || '',
      selectedSeatNumber: seatInfo?.seatNumber || 0
    });
    // Load seats for current table if participant has seat assignment
    if (seatInfo?.tableId) {
      fetchSeatsForTable(seatInfo.tableId);
    }
    setError(null);
    setIsEditDialogOpen(true);
  };

  const handleEditParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    setError(null);

    // Safety timeout to prevent infinite loading state
    const safetyTimeout = setTimeout(() => {
      console.warn('[ParticipantManagement] Edit timeout - resetting state');
      setIsSubmitting(false);
      setError('Request timed out. Please try again.');
    }, 30000);

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

      // Clear timeout immediately after successful update to prevent race condition
      clearTimeout(safetyTimeout);

      // Handle seat assignment changes
      const currentSeat = seatAssignments[editingParticipant.id];
      const newTableId = formData.selectedSeatTableId;
      const newSeatNumber = formData.selectedSeatNumber;

      // If seat changed or removed
      if (currentSeat?.tableId !== newTableId || currentSeat?.seatNumber !== newSeatNumber) {
        // Remove old assignment if exists
        if (currentSeat) {
          await supabase
            .from('seat_assignments')
            .update({ participant_id: null })
            .eq('table_id', currentSeat.tableId)
            .eq('seat_number', currentSeat.seatNumber);
        }

        // Add new assignment if selected
        if (newTableId && newSeatNumber > 0) {
          await supabase
            .from('seat_assignments')
            .update({ participant_id: editingParticipant.id })
            .eq('table_id', newTableId)
            .eq('seat_number', newSeatNumber);
        }
      }

      setIsEditDialogOpen(false);
      setEditingParticipant(null);
      
      // Refresh participants list and seat assignments (don't await to speed up UI)
      fetchParticipants().catch(err => {
        console.error('[Background Refresh] Failed to refresh participants:', err);
      });
      fetchSeatAssignments().catch(err => {
        console.error('[Background Refresh] Failed to refresh seat assignments:', err);
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        customData: {},
        selectedSeatTableId: '',
        selectedSeatNumber: 0
      });
    } catch (err: any) {
      clearTimeout(safetyTimeout);
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

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedParticipantIds);
      console.log('[SUPABASE] Bulk deleting participants:', idsToDelete);
      
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', idsToDelete);
      
      if (error) {
        throw new Error(`Failed to delete participants: ${error.message}`);
      }
      
      setSelectedParticipantIds(new Set());
      await fetchParticipants();
      alert(`Successfully deleted ${idsToDelete.length} participants`);
    } catch (err: any) {
      console.error('[SUPABASE] Error bulk deleting participants:', err);
      alert('Failed to delete participants');
    }
  };

  const handleBulkEmail = () => {
    // Open dialog to select template and send to all selected participants
    setIsBulkEmailDialogOpen(true);
  };

  const handleSendBulkEmail = async () => {
    if (!bulkEmailTemplateId) {
      alert('Please select a template');
      return;
    }

    try {
      setIsSendingBulkEmail(true);
      const selectedParticipants = participants.filter(p => 
        selectedParticipantIds.has(p.id)
      );

      // Get template
      const template = emailTemplates.find(t => t.id === bulkEmailTemplateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get event details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      let successCount = 0;
      let failCount = 0;

      // Send email to each selected participant
      for (const participant of selectedParticipants) {
        try {
          // Replace placeholders
          const replacePlaceholders = (text: string) => {
            return text
              .replace(/\{\{name\}\}/g, participant.name || '')
              .replace(/\{\{email\}\}/g, participant.email || '')
              .replace(/\{\{phone\}\}/g, participant.phone || '')
              .replace(/\{\{company\}\}/g, participant.company || '')
              .replace(/\{\{position\}\}/g, participant.position || '')
              .replace(/\{\{event_name\}\}/g, eventData?.name || '')
              .replace(/\{\{event_date\}\}/g, eventData?.startDate || '')
              .replace(/\{\{participant_id\}\}/g, participant.id || '');
          };

          const personalizedSubject = replacePlaceholders(template.subject);
          const personalizedBody = replacePlaceholders(template.body);

          // Prepare attachments array
          let emailAttachments = template.attachments || [];

          // Add participant QR code if template requires it
          if (template.include_qr_code && participant.qr_code_url) {
            emailAttachments = [...emailAttachments, participant.qr_code_url];
          }

          // Send email via Supabase Edge Function
          const { error: sendError } = await supabase.functions.invoke('send-email', {
            body: {
              to: participant.email,
              subject: personalizedSubject,
              html: personalizedBody,
              participantId: participant.id,
              templateId: template.id,
              attachments: emailAttachments
            }
          });

          // Log to participant_emails
          const emailStatus = sendError ? 'failed' : 'sent';
          await supabase.from('participant_emails').insert({
            participant_id: participant.id,
            template_id: template.id,
            template_name: template.name,
            subject: personalizedSubject,
            status: emailStatus,
            error_message: sendError ? JSON.stringify(sendError) : null
          });

          if (sendError) {
            throw new Error(sendError.message || 'Failed to send email');
          }

          successCount++;
        } catch (err) {
          console.error(`Failed to send email to ${participant.email}:`, err);
          failCount++;
        }
      }

      setIsSendingBulkEmail(false);
      setIsBulkEmailDialogOpen(false);
      setBulkEmailTemplateId('');
      setSelectedParticipantIds(new Set());

      if (failCount > 0) {
        alert(`Sent ${successCount} emails successfully, ${failCount} failed`);
      } else {
        alert(`Successfully sent ${successCount} emails`);
      }
    } catch (err: any) {
      console.error('Error sending bulk emails:', err);
      setIsSendingBulkEmail(false);
      alert('Failed to send emails');
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
    <div className="space-y-6">
      {/* Header - Outside Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Participants Management</h2>
            <p className="text-sm text-gray-600 mt-1 flex items-center gap-4">
              <span>Total: <span className="font-semibold text-primary-700">{participants.length}</span></span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>Auto-sync • Updated {lastUpdated.toLocaleTimeString()}</span>
              </span>
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gradient-primary hover:opacity-90 text-white shadow-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Participant
        </Button>
      </div>

    <Card className="border-0 shadow-xl bg-white" style={{ position: 'relative', zIndex: 0 }}>
      <CardHeader className="border-b border-gray-100 py-3">
        <div className="flex flex-wrap gap-2">
            <Button 
              onClick={copyRegistrationURL} 
              variant="outline"
              size="sm"
              className="border-primary-300 hover:border-primary-500 hover:bg-primary-50"
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
            {/* Print Badges Button - Opens Template Selection Dialog */}
            <Button 
              onClick={() => setShowTemplateSelector(true)} 
              variant="outline" 
              size="sm" 
              className="border-primary-300 hover:border-primary-400 text-primary-700 hover:bg-primary-50"
              disabled={selectedParticipantIds.size === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Badges {selectedParticipantIds.size > 0 && `(${selectedParticipantIds.size})`}
            </Button>
          </div>
      </CardHeader>

      {/* Add Participant Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                              id={`add-custom-${field.id}`}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              value={formData.customData?.[field.id] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.id]: e.target.value }
                              }))}
                              required={field.required}
                            />
                          ) : field.type === 'select' && field.options ? (
                            <select
                              id={`add-custom-${field.id}`}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={formData.customData?.[field.id] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.id]: e.target.value }
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
                              id={`add-custom-${field.id}`}
                              type="date"
                              value={formData.customData?.[field.id] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.id]: e.target.value }
                              }))}
                              required={field.required}
                              className="w-full"
                            />
                          ) : (
                            <Input
                              id={`add-custom-${field.id}`}
                              type={field.type}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              value={formData.customData?.[field.id] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: { ...prev.customData, [field.id]: e.target.value }
                              }))}
                              required={field.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Email Confirmation Section */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="send-confirmation"
                          checked={sendConfirmationEmail}
                          onChange={(e) => setSendConfirmationEmail(e.target.checked)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <Label htmlFor="send-confirmation" className="cursor-pointer font-medium">
                          Send Confirmation Email
                        </Label>
                      </div>
                    </div>

                    {sendConfirmationEmail && (
                      <div className="space-y-2 pl-4 border-l-2 border-blue-300">
                        <Label>Email Template</Label>
                        <Select
                          value={selectedTemplateId}
                          onValueChange={setSelectedTemplateId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select email template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {emailTemplates.length === 0 ? (
                              <SelectItem value="no-templates" disabled>No templates available</SelectItem>
                            ) : (
                              emailTemplates.map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name} - {template.subject}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {emailTemplates.length === 0 && (
                          <p className="text-xs text-amber-600">
                            ⚠️ Create email templates in Email Center first
                          </p>
                        )}
                      </div>
                    )}
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

                  {/* Seat Assignment */}
                  {availableTables.length > 0 && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-700">Seat Assignment</div>
                        {formData.selectedSeatTableId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-600 hover:text-red-700 h-6 px-2"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, selectedSeatTableId: '', selectedSeatNumber: 0 }));
                              setAvailableSeatsForTable([]);
                            }}
                          >
                            Clear Seat
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-seat-table">Table</Label>
                          <Select
                            value={formData.selectedSeatTableId || undefined}
                            onValueChange={(value) => {
                              setFormData(prev => ({ ...prev, selectedSeatTableId: value, selectedSeatNumber: 0 }));
                              fetchSeatsForTable(value);
                            }}
                          >
                            <SelectTrigger id="edit-seat-table">
                              <SelectValue placeholder="Select table" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTables.map(table => {
                                const occupied = tableOccupancy[table.id] || 0;
                                const available = table.capacity - occupied;
                                return (
                                  <SelectItem key={table.id} value={table.id}>
                                    {table.name} ({available} available)
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-seat-number">Seat Number</Label>
                          <Select
                            value={formData.selectedSeatNumber > 0 ? String(formData.selectedSeatNumber) : undefined}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, selectedSeatNumber: parseInt(value) || 0 }))}
                            disabled={!formData.selectedSeatTableId || isLoadingSeats}
                          >
                            <SelectTrigger id="edit-seat-number">
                              <SelectValue placeholder={isLoadingSeats ? "Loading..." : "Select seat"} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSeatsForTable.map(seat => (
                                <SelectItem 
                                  key={seat.seatNumber} 
                                  value={String(seat.seatNumber)}
                                  disabled={seat.isOccupied && seat.occupantName !== editingParticipant?.name}
                                >
                                  Seat {seat.seatNumber} {seat.isOccupied ? `(${seat.occupantName})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

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
                              id={`edit-custom-${field.id}`}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={formData.customData?.[field.id] || formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.id]: e.target.value
                                }
                              }))}
                              required={field.required}
                            />
                          ) : field.type === 'select' && field.options ? (
                            <select
                              id={`edit-custom-${field.id}`}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={formData.customData?.[field.id] || formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.id]: e.target.value
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
                              id={`edit-custom-${field.id}`}
                              type="date"
                              value={formData.customData?.[field.id] || formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.id]: e.target.value
                                }
                              }))}
                              required={field.required}
                              className="w-full"
                            />
                          ) : (
                            <Input
                              id={`edit-custom-${field.id}`}
                              type={field.type}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              value={formData.customData?.[field.id] || formData.customData?.[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customData: {
                                  ...prev.customData,
                                  [field.id]: e.target.value
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

            {/* Bulk Email Dialog */}
            <Dialog open={isBulkEmailDialogOpen} onOpenChange={setIsBulkEmailDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Email to Selected Participants</DialogTitle>
                  <DialogDescription>
                    Send an email template to {selectedParticipantIds.size} selected participants
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Template</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={bulkEmailTemplateId}
                      onChange={(e) => setBulkEmailTemplateId(e.target.value)}
                    >
                      <option value="">Choose a template</option>
                      {emailTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsBulkEmailDialogOpen(false)}
                      disabled={isSendingBulkEmail}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendBulkEmail}
                      disabled={!bulkEmailTemplateId || isSendingBulkEmail}
                      className="gradient-primary"
                    >
                      {isSendingBulkEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        `Send to ${selectedParticipantIds.size} Participants`
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

      <CardContent className="pt-6">
        <div className="mb-6 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Quick search across all fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-300 transition-colors"
              />
            </div>
            
            <Button 
              onClick={() => {
                if (!showAdvancedFilters) {
                  // Load current filters into staging when opening
                  // If no filters exist, create one default filter
                  if (columnFilters.length === 0) {
                    setStagingFilters([{
                      id: Date.now().toString(),
                      column: 'name',
                      operator: 'contains',
                      value: ''
                    }]);
                  } else {
                    setStagingFilters([...columnFilters]);
                  }
                }
                setShowAdvancedFilters(!showAdvancedFilters);
              }}
              variant="outline" 
              size="sm" 
              className={`h-12 border-gray-300 hover:border-gray-400 ${showAdvancedFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {columnFilters.length > 0 && (
                <Badge className="ml-2 bg-primary-600 text-white text-xs px-1.5 py-0.5">
                  {columnFilters.length}
                </Badge>
              )}
            </Button>
            
            {selectedParticipantIds.size > 0 ? (
              <>
                <div className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium">{selectedParticipantIds.size} selected</span>
                </div>
                <Button 
                  onClick={() => {
                    if (confirm(`Delete ${selectedParticipantIds.size} selected participants?`)) {
                      handleBulkDelete();
                    }
                  }}
                  variant="outline" 
                  size="sm" 
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  Delete Selected
                </Button>
                <Button 
                  onClick={handleBulkEmail}
                  variant="outline" 
                  size="sm" 
                  className="border-primary-300 text-primary-600 hover:bg-primary-50 hover:border-primary-400"
                >
                  Email Selected
                </Button>
                <Button 
                  onClick={() => setSelectedParticipantIds(new Set())}
                  variant="ghost" 
                  size="sm"
                  className="text-gray-600"
                >
                  Clear Selection
                </Button>
              </>
            ) : (
              <Button onClick={downloadCSVTemplate} variant="outline" size="sm" className="border-gray-300 hover:border-gray-400">
                Download Template
              </Button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="bg-white border border-primary-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-primary-900">Column Filters</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStagingFilters([...stagingFilters, {
                        id: Date.now().toString(),
                        column: 'name',
                        operator: 'contains',
                        value: ''
                      }]);
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  {stagingFilters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStagingFilters([])}
                      className="h-7 text-xs text-gray-600"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {stagingFilters.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-3">
                  No filters. Click "Add" to create a filter.
                </p>
              ) : (
                <div className="space-y-2">
                  {stagingFilters.map((filter, index) => (
                    <div key={filter.id} className="flex gap-2 items-center">
                      {/* Column Selector */}
                      <select
                        value={filter.column}
                        onChange={(e) => {
                          const updated = [...stagingFilters];
                          updated[index].column = e.target.value;
                          setStagingFilters(updated);
                        }}
                        className="flex-1 h-8 px-2 rounded-md border border-gray-300 bg-white text-xs focus:border-primary-300 focus:ring-1 focus:ring-primary-100"
                      >
                        <optgroup label="Basic">
                          <option value="name">Name</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="company">Company</option>
                          <option value="position">Position</option>
                          <option value="id">ID</option>
                        </optgroup>
                        {customFields.length > 0 && (
                          <optgroup label="Custom">
                            {customFields.map(field => (
                              <option key={field.id} value={`custom_${field.name}`}>
                                {field.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Special">
                          <option value="attendance">Attendance</option>
                          <option value="campaigns">Campaigns</option>
                        </optgroup>
                      </select>

                      {/* Operator */}
                      <select
                        value={filter.operator}
                        onChange={(e) => {
                          const updated = [...stagingFilters];
                          updated[index].operator = e.target.value as any;
                          setStagingFilters(updated);
                        }}
                        className="w-32 h-8 px-2 rounded-md border border-gray-300 bg-white text-xs focus:border-primary-300 focus:ring-1 focus:ring-primary-100"
                      >
                        <option value="contains">Contains</option>
                        <option value="equals">Equals</option>
                        <option value="starts-with">Starts with</option>
                        <option value="ends-with">Ends with</option>
                        <option value="not-empty">Not empty</option>
                        <option value="empty">Is empty</option>
                      </select>

                      {/* Value */}
                      {filter.operator !== 'not-empty' && filter.operator !== 'empty' && (
                        <Input
                          value={filter.value}
                          onChange={(e) => {
                            const updated = [...stagingFilters];
                            updated[index].value = e.target.value;
                            setStagingFilters(updated);
                          }}
                          placeholder="Value..."
                          className="flex-1 h-8 text-xs"
                        />
                      )}

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStagingFilters(stagingFilters.filter(f => f.id !== filter.id));
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 gap-3">
                <div className="text-xs text-gray-600 flex-shrink-0">
                  {stagingFilters.length > 0 ? (
                    <span>{stagingFilters.length} filter{stagingFilters.length > 1 ? 's' : ''} ready</span>
                  ) : columnFilters.length > 0 ? (
                    <span className="text-primary-700 font-medium">{columnFilters.length} active</span>
                  ) : (
                    <span className="text-gray-400">No filters</span>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Reset values but keep the filter rows
                      const clearedFilters = stagingFilters.map(f => ({
                        ...f,
                        value: ''
                      }));
                      setStagingFilters(clearedFilters);
                      setColumnFilters([]);
                    }}
                    className="h-8 px-3 text-xs border-gray-300 text-gray-600"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => {
                      setColumnFilters([...stagingFilters]);
                    }}
                    size="sm"
                    className="h-8 px-4 text-xs gradient-primary hover:opacity-90 text-white shadow-md shadow-primary-500/30"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm" style={{ position: 'relative', zIndex: 0 }}>
          {/* Scroll shadows for visual feedback */}
          <div 
            className="scroll-shadow-left absolute left-0 top-0 bottom-0 w-8 pointer-events-none transition-opacity duration-300 bg-gradient-to-r from-white via-white/50 to-transparent z-20" 
            style={{ opacity: 0 }}
          ></div>
          <div 
            className="scroll-shadow-right absolute right-0 top-0 bottom-0 w-8 pointer-events-none transition-opacity duration-300 bg-gradient-to-l from-white via-white/50 to-transparent z-20" 
            style={{ opacity: 1 }}
          ></div>
          
          <div 
            className="overflow-x-auto overflow-y-auto" 
            style={{ 
              position: 'relative',
              maxHeight: 'calc(100vh - 400px)', // Adaptive height
              minHeight: '400px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#a855f7 #f3f4f6'
            }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const leftShadow = document.querySelector('.scroll-shadow-left') as HTMLElement;
              const rightShadow = document.querySelector('.scroll-shadow-right') as HTMLElement;
              
              if (leftShadow) {
                leftShadow.style.opacity = el.scrollLeft > 10 ? '1' : '0';
              }
              if (rightShadow) {
                rightShadow.style.opacity = (el.scrollLeft < el.scrollWidth - el.clientWidth - 10) ? '1' : '0';
              }
            }}
          >
            {/* Use native table instead of shadcn Table component for sticky header */}
            <table className="w-full caption-bottom text-sm" style={{ minWidth: '1300px', tableLayout: 'fixed' }}>
              <thead style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 30, 
                backgroundColor: 'white', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }} className="border-b">
                <TableRow>
                  {/* Selection Checkbox */}
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableHead>
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
                  {/* Seat Column */}
                  <TableHead 
                    className="relative"
                    style={{ width: '120px', minWidth: '120px' }}
                  >
                    <span className="font-semibold">Seat</span>
                  </TableHead>
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
                  {columnVisibility.emailStatus && (
                    <TableHead 
                      className="relative"
                      style={{ width: `${columnWidths.emailStatus || 250}px`, minWidth: `${columnWidths.emailStatus || 250}px` }}
                    >
                      <div className="flex items-center gap-1 font-semibold">
                        Email Campaigns
                      </div>
                      <ResizeHandle columnKey="emailStatus" />
                    </TableHead>
                  )}
                  <TableHead 
                    className="text-right sticky right-0 bg-gray-50"
                    style={{ 
                      width: `${columnWidths.actions}px`, 
                      minWidth: `${columnWidths.actions}px`,
                      position: 'sticky',
                      right: 0,
                      zIndex: 40,
                      backgroundColor: 'rgb(249 250 251)'
                    }}
                  >
                    Actions
                  </TableHead>
                </TableRow>
              </thead>
            <TableBody>
              {paginatedParticipants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5 + 
                    (columnVisibility.phone ? 1 : 0) +
                    (columnVisibility.company ? 1 : 0) +
                    (columnVisibility.position ? 1 : 0) +
                    customFields.length +
                    (columnVisibility.attendance ? 1 : 0) +
                    (columnVisibility.registered ? 1 : 0) +
                    (columnVisibility.emailStatus ? 1 : 0) +
                    1} className="text-center text-muted-foreground">
                    {filteredParticipants.length === 0 ? 'No participants found' : 'No results on this page'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedParticipants.map((participant) => (
                  <TableRow 
                    key={participant.id}
                    className={selectedParticipantIds.has(participant.id) ? 'bg-blue-50' : ''}
                  >
                    {/* Selection Checkbox */}
                    <TableCell className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedParticipantIds.has(participant.id)}
                        onChange={(e) => handleSelectOne(participant.id, e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell 
                      className="font-mono text-xs truncate" 
                      title={participant.id}
                      style={{ width: `${columnWidths.id}px`, maxWidth: `${columnWidths.id}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {participant.id.substring(5, 15)}...
                    </TableCell>
                    <TableCell 
                      className="font-medium truncate"
                      title={participant.name}
                      style={{ width: `${columnWidths.name}px`, maxWidth: `${columnWidths.name}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {participant.name}
                    </TableCell>
                    <TableCell 
                      className="text-sm truncate"
                      title={participant.email}
                      style={{ width: `${columnWidths.email}px`, maxWidth: `${columnWidths.email}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {participant.email}
                    </TableCell>
                    {columnVisibility.phone && (
                      <TableCell 
                        className="truncate"
                        style={{ width: `${columnWidths.phone}px`, maxWidth: `${columnWidths.phone}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {participant.phone || '-'}
                      </TableCell>
                    )}
                    {columnVisibility.company && (
                      <TableCell 
                        className="truncate"
                        title={participant.company || '-'}
                        style={{ width: `${columnWidths.company}px`, maxWidth: `${columnWidths.company}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {participant.company || '-'}
                      </TableCell>
                    )}
                    {columnVisibility.position && (
                      <TableCell 
                        className="truncate"
                        title={participant.position || '-'}
                        style={{ width: `${columnWidths.position}px`, maxWidth: `${columnWidths.position}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {participant.position || '-'}
                      </TableCell>
                    )}
                    {/* Seat Cell */}
                    <TableCell style={{ width: '120px', maxWidth: '120px' }}>
                      {seatAssignments[participant.id] ? (
                        <Badge 
                          variant="outline" 
                          className="bg-primary-50 text-primary-700 text-xs cursor-pointer hover:bg-primary-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSeatAssignParticipant(participant);
                            setShowSeatAssignDialog(true);
                          }}
                        >
                          {seatAssignments[participant.id].tableName} - {seatAssignments[participant.id].seatNumber}
                        </Badge>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="text-gray-400 text-xs cursor-pointer hover:bg-gray-100 transition-colors border-dashed"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSeatAssignParticipant(participant);
                            setShowSeatAssignDialog(true);
                          }}
                        >
                          + Assign
                        </Badge>
                      )}
                    </TableCell>
                    {customFields.map(field => {
                      const columnKey = `custom_${field.name}`;
                      const width = columnWidths[columnKey] || 150;
                      // Use field.id to access customData, not field.name
                      const value = participant.customData?.[field.id] || participant.customData?.[field.name] || '-';
                      return (
                        <TableCell 
                          key={field.id}
                          className="truncate"
                          title={value}
                          style={{ width: `${width}px`, maxWidth: `${width}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                    {columnVisibility.attendance && (
                      <TableCell
                        style={{ width: `${columnWidths.attendance}px`, maxWidth: `${columnWidths.attendance}px` }}
                      >
                        {getAttendanceTags(participant)}
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
                    {columnVisibility.emailStatus && (
                      <TableCell 
                        style={{ width: `${columnWidths.emailStatus}px`, maxWidth: `${columnWidths.emailStatus}px` }}
                      >
                        {getEmailCampaignTags(participant)}
                      </TableCell>
                    )}
                    <TableCell 
                      className="text-right sticky right-0 bg-white border-l"
                      style={{ 
                        width: `${columnWidths.actions}px`, 
                        minWidth: `${columnWidths.actions}px`,
                        position: 'sticky',
                        right: 0,
                        zIndex: 20,
                        backgroundColor: 'white'
                      }}
                    >
                      <div className="flex gap-1 justify-end items-center" style={{ minWidth: '130px' }}>
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
            </table>
          </div>
          
          {/* Horizontal scroll hint */}
          <div className="text-center py-1 text-xs text-gray-400 border-t bg-gray-50/50">
            ← Scroll horizontally to see more columns →
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredParticipants.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow-sm mt-3 border border-gray-200">
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
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary-600" />
            <p className="mt-4 text-gray-700">Sending email...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Print Badge Template Selection Dialog */}
    <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary-600" />
            Print Badges
          </DialogTitle>
          <DialogDescription>
            Select a badge template to print {selectedParticipantIds.size} participant{selectedParticipantIds.size > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {availableTemplates.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Badge Template</Label>
              <Select
                value={selectedBadgeTemplate?.id || ''}
                onValueChange={(value) => {
                  const template = availableTemplates.find(t => t.id === value);
                  handleTemplateSelect(template || null);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.is_default && (
                          <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : badgeTemplate ? (
            <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-800">
                Using default badge template from event settings.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                No badge templates found. Please create one in Badge Designer first.
              </p>
            </div>
          )}
          
          {selectedBadgeTemplate && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Selected Template</p>
              <p className="font-medium text-gray-900">{selectedBadgeTemplate.name}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setShowTemplateSelector(false)}
            className="px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowTemplateSelector(false);
              handlePrintBadges();
            }}
            disabled={!badgeTemplate && !selectedBadgeTemplate}
            style={{ backgroundColor: '#7c3aed', color: 'white' }}
            className="px-4 hover:opacity-90"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Quick Seat Assignment Dialog */}
    <Dialog 
      open={showSeatAssignDialog} 
      onOpenChange={(open) => {
        setShowSeatAssignDialog(open);
        if (!open) {
          setSeatAssignParticipant(null);
          setQuickAssignTableId('');
          setQuickAssignSeatNumber(0);
          setAvailableSeatsForTable([]);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Seat</DialogTitle>
          <DialogDescription>
            {seatAssignParticipant && (
              <>Assign seat for <strong>{seatAssignParticipant.name}</strong></>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Assignment */}
          {seatAssignParticipant && seatAssignments[seatAssignParticipant.id] && (
            <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-800">
                Currently assigned to: <strong>{seatAssignments[seatAssignParticipant.id].tableName} - Seat {seatAssignments[seatAssignParticipant.id].seatNumber}</strong>
              </p>
            </div>
          )}
          
          {/* Table Selection */}
          <div className="space-y-2">
            <Label>Select Table</Label>
            <Select
              value={quickAssignTableId}
              onValueChange={(value) => {
                setQuickAssignTableId(value);
                setQuickAssignSeatNumber(0);
                fetchSeatsForTable(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a table" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map(table => {
                  const occupied = tableOccupancy[table.id] || 0;
                  const available = table.capacity - occupied;
                  return (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({available} available)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Seat Selection */}
          {quickAssignTableId && (
            <div className="space-y-2">
              <Label>Select Seat</Label>
              {isLoadingSeats ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading seats...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50">
                  {availableSeatsForTable.map(seat => {
                    const isCurrentParticipant = seat.occupantName === seatAssignParticipant?.name;
                    const isSelected = quickAssignSeatNumber === seat.seatNumber;
                    
                    return (
                      <button
                        key={seat.seatNumber}
                        type="button"
                        onClick={() => {
                          if (!seat.isOccupied || isCurrentParticipant) {
                            setQuickAssignSeatNumber(seat.seatNumber);
                          }
                        }}
                        disabled={seat.isOccupied && !isCurrentParticipant}
                        className={`
                          w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg border-2 transition-all
                          ${isSelected 
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105' 
                            : seat.isOccupied && !isCurrentParticipant
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300'
                              : isCurrentParticipant
                                ? 'bg-primary-100 text-primary-700 border-primary-400 hover:bg-primary-200'
                                : 'bg-white hover:bg-primary-50 border-gray-300 hover:border-primary-400'
                          }
                        `}
                        title={seat.isOccupied ? seat.occupantName : `Seat ${seat.seatNumber}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Legend */}
              <div className="flex gap-4 text-xs text-gray-500 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-primary-600 rounded"></div>
                  <span>Selected</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 justify-between pt-4 border-t">
          <div>
            {seatAssignParticipant && seatAssignments[seatAssignParticipant.id] && (
              <Button
                variant="outline"
                onClick={handleRemoveSeatAssignment}
                disabled={isAssigningSeat}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Remove Seat
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSeatAssignDialog(false);
                setSeatAssignParticipant(null);
                setQuickAssignTableId('');
                setQuickAssignSeatNumber(0);
                setAvailableSeatsForTable([]);
              }}
              disabled={isAssigningSeat}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickSeatAssign}
              disabled={!quickAssignTableId || quickAssignSeatNumber <= 0 || isAssigningSeat}
              className="gradient-primary"
            >
              {isAssigningSeat ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Seat'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Badge Print View - Hidden except when printing */}
    {badgeTemplate && (
      <BadgePrintView
        participants={Array.from(selectedParticipantIds).map(id => 
          participants.find(p => p.id === id)!
        ).filter(Boolean)}
        badgeTemplate={badgeTemplate}
        eventName={eventName}
      />
    )}
    </div>
  );
}
