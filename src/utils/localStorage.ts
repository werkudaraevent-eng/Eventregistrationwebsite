// Local storage utility for offline-first participant management

export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  required: boolean;
  options?: string[]; // For select type
  order: number;
}

export interface ColumnVisibility {
  phone: boolean;
  company: boolean;
  position: boolean;
  attendance: boolean;
  registered: boolean;
}

export interface BrandingSettings {
  logoUrl?: string;
  logoAlignment: 'left' | 'center' | 'right';
  logoSize: 'small' | 'medium' | 'large';
  primaryColor: string;
  backgroundColor: string;
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  customHeader?: string;
}

export type BadgeSize = 'CR80' | 'A6' | 'A7' | 'custom';

export interface BadgeComponent {
  id: string;
  type: 'field' | 'qrcode' | 'logo' | 'eventName';
  fieldName?: string; // For type 'field' - can be standard field or custom field name
  label?: string;
  enabled: boolean;
  order: number;
}

export interface BadgeSettings {
  size: BadgeSize;
  customWidth?: number; // in mm
  customHeight?: number; // in mm
  components: BadgeComponent[];
  fontSize: 'small' | 'medium' | 'large';
  alignment: 'left' | 'center' | 'right';
  backgroundColor: string;
  backgroundImageUrl?: string; // Custom background image
  backgroundImageFit?: 'cover' | 'contain'; // How to scale background image
  logoUrl?: string;
  logoSize: 'small' | 'medium' | 'large';
  qrCodeSize: 'small' | 'medium' | 'large';
}

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  createdAt: string;
  customFields?: CustomField[]; // Custom fields for this event's registration
  columnVisibility?: ColumnVisibility; // Control which columns are visible in participant table
  branding?: BrandingSettings; // Registration page branding
  badgeSettings?: BadgeSettings; // Badge printing configuration
}

export interface Participant {
  id: string;
  eventId: string; // Link to event
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  registeredAt: string;
  attendance: Array<{ agendaItem: string; timestamp: string }>;
  customData?: Record<string, any>; // Flexible storage for custom field values
}

export interface AgendaItem {
  id: string;
  eventId: string; // Link to event
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  createdAt: string;
}

const EVENTS_KEY = 'events';
const PARTICIPANTS_KEY = 'event_participants';
const AGENDA_KEY = 'event_agenda';
const SELECTED_EVENT_KEY = 'selected_event_id';

// Generate unique IDs
export function generateEventId(): string {
  return 'E' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function generateParticipantId(): string {
  return 'P' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();
}

export function generateAgendaId(): string {
  return 'A' + Date.now();
}

// ===== EVENT MANAGEMENT =====

export function getAllEvents(): Event[] {
  try {
    const data = localStorage.getItem(EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading events from localStorage:', error);
    return [];
  }
}

export function getEventById(id: string): Event | null {
  const events = getAllEvents();
  return events.find(e => e.id === id) || null;
}

export function saveEvent(event: Event): void {
  const events = getAllEvents();
  events.push(event);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function updateEvent(id: string, updates: Partial<Event>): void {
  const events = getAllEvents();
  const index = events.findIndex(e => e.id === id);
  
  if (index === -1) {
    throw new Error('Event not found');
  }
  
  events[index] = { ...events[index], ...updates };
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function deleteEvent(id: string): void {
  const events = getAllEvents();
  const filtered = events.filter(e => e.id !== id);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
  
  // Also delete all associated data
  const participants = getAllParticipants().filter(p => p.eventId !== id);
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
  
  const agenda = getAllAgenda().filter(a => a.eventId !== id);
  localStorage.setItem(AGENDA_KEY, JSON.stringify(agenda));
  
  // Clear selected event if it was this one
  if (getSelectedEventId() === id) {
    clearSelectedEvent();
  }
}

export function setSelectedEvent(eventId: string): void {
  localStorage.setItem(SELECTED_EVENT_KEY, eventId);
}

export function getSelectedEventId(): string | null {
  return localStorage.getItem(SELECTED_EVENT_KEY);
}

export function clearSelectedEvent(): void {
  localStorage.removeItem(SELECTED_EVENT_KEY);
}

// ===== CUSTOM FIELDS MANAGEMENT =====

export function generateCustomFieldId(): string {
  return 'CF' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function addCustomField(eventId: string, field: Omit<CustomField, 'id'>): CustomField {
  const events = getAllEvents();
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  const newField: CustomField = {
    id: generateCustomFieldId(),
    ...field
  };
  
  if (!event.customFields) {
    event.customFields = [];
  }
  
  event.customFields.push(newField);
  updateEvent(eventId, { customFields: event.customFields });
  
  return newField;
}

export function updateCustomField(eventId: string, fieldId: string, updates: Partial<CustomField>): void {
  const events = getAllEvents();
  const event = events.find(e => e.id === eventId);
  
  if (!event || !event.customFields) {
    throw new Error('Event or custom fields not found');
  }
  
  const fieldIndex = event.customFields.findIndex(f => f.id === fieldId);
  if (fieldIndex === -1) {
    throw new Error('Custom field not found');
  }
  
  event.customFields[fieldIndex] = { ...event.customFields[fieldIndex], ...updates };
  updateEvent(eventId, { customFields: event.customFields });
}

export function deleteCustomField(eventId: string, fieldId: string): void {
  const events = getAllEvents();
  const event = events.find(e => e.id === eventId);
  
  if (!event || !event.customFields) {
    throw new Error('Event or custom fields not found');
  }
  
  event.customFields = event.customFields.filter(f => f.id !== fieldId);
  updateEvent(eventId, { customFields: event.customFields });
  
  // Clean up participant data for this field
  const participants = getAllParticipants(eventId);
  participants.forEach(p => {
    if (p.customData && p.customData[fieldId]) {
      delete p.customData[fieldId];
      updateParticipant(p.id, { customData: p.customData });
    }
  });
}

export function reorderCustomFields(eventId: string, fieldIds: string[]): void {
  const events = getAllEvents();
  const event = events.find(e => e.id === eventId);
  
  if (!event || !event.customFields) {
    throw new Error('Event or custom fields not found');
  }
  
  // Reorder fields based on the provided array
  const reorderedFields = fieldIds.map((id, index) => {
    const field = event.customFields!.find(f => f.id === id);
    if (!field) throw new Error(`Field ${id} not found`);
    return { ...field, order: index };
  });
  
  updateEvent(eventId, { customFields: reorderedFields });
}

// ===== COLUMN VISIBILITY MANAGEMENT =====

export function getColumnVisibility(eventId: string): ColumnVisibility {
  const event = getEventById(eventId);
  
  // Default visibility - all columns visible by default
  const defaults: ColumnVisibility = {
    phone: true,
    company: true,
    position: true,
    attendance: true,
    registered: true
  };
  
  return event?.columnVisibility || defaults;
}

export function updateColumnVisibility(eventId: string, visibility: Partial<ColumnVisibility>): void {
  const event = getEventById(eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  const currentVisibility = getColumnVisibility(eventId);
  const updatedVisibility = { ...currentVisibility, ...visibility };
  
  updateEvent(eventId, { columnVisibility: updatedVisibility });
}

// ===== BRANDING MANAGEMENT =====

export function getBrandingSettings(eventId: string): BrandingSettings {
  const event = getEventById(eventId);
  
  // Default branding settings
  const defaults: BrandingSettings = {
    logoAlignment: 'center',
    logoSize: 'medium',
    primaryColor: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: 'sans-serif'
  };
  
  return event?.branding || defaults;
}

export function updateBrandingSettings(eventId: string, branding: Partial<BrandingSettings>): void {
  const event = getEventById(eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  const currentBranding = getBrandingSettings(eventId);
  const updatedBranding = { ...currentBranding, ...branding };
  
  updateEvent(eventId, { branding: updatedBranding });
}

// ===== BADGE SETTINGS MANAGEMENT =====

export function getBadgeSettings(eventId: string): BadgeSettings {
  const event = getEventById(eventId);
  
  // Default badge settings
  const defaults: BadgeSettings = {
    size: 'CR80',
    components: [
      { id: '1', type: 'eventName', enabled: true, order: 0 },
      { id: '2', type: 'field', fieldName: 'name', label: 'Name', enabled: true, order: 1 },
      { id: '3', type: 'field', fieldName: 'company', label: 'Company', enabled: true, order: 2 },
      { id: '4', type: 'qrcode', enabled: true, order: 3 }
    ],
    fontSize: 'medium',
    alignment: 'center',
    backgroundColor: '#ffffff',
    logoSize: 'medium',
    qrCodeSize: 'medium'
  };
  
  return event?.badgeSettings || defaults;
}

export function updateBadgeSettings(eventId: string, settings: Partial<BadgeSettings>): void {
  const event = getEventById(eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  const currentSettings = getBadgeSettings(eventId);
  const updatedSettings = { ...currentSettings, ...settings };
  
  updateEvent(eventId, { badgeSettings: updatedSettings });
}

// ===== DATA MIGRATION =====

// Migrate old data (without eventId) to new structure
export function migrateToMultiEventStructure(): void {
  try {
    console.log('='.repeat(80));
    console.log('[MIGRATION] Starting data migration to multi-event structure...');
    console.log('='.repeat(80));
    
    // Check if there are any events
    const events = getAllEvents();
    
    // Get all participants and agenda items
    const allParticipants = getAllParticipants();
    const allAgenda = getAllAgenda();
    
    // Find participants and agenda without eventId
    const participantsWithoutEvent = allParticipants.filter(p => !p.eventId);
    const agendaWithoutEvent = allAgenda.filter(a => !a.eventId);
    
    if (participantsWithoutEvent.length === 0 && agendaWithoutEvent.length === 0) {
      console.log('[MIGRATION] ✓ All data already has event associations');
      console.log('[MIGRATION] Current system state:', {
        totalEvents: events.length,
        totalParticipants: allParticipants.length,
        totalAgendaItems: allAgenda.length,
        dataIntegrityVerified: true
      });
      console.log('='.repeat(80));
      return;
    }
    
    console.warn('[MIGRATION] ⚠ Found orphaned data without event associations:', {
      participants: participantsWithoutEvent.length,
      agenda: agendaWithoutEvent.length
    });
    
    // Create a default event if none exists
    let defaultEvent: Event | null = null;
    if (events.length === 0) {
      console.log('[MIGRATION] Creating default event for orphaned data...');
      defaultEvent = {
        id: generateEventId(),
        name: 'Default Event',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        location: '',
        description: 'Auto-created event for existing data',
        createdAt: new Date().toISOString(),
      };
      saveEvent(defaultEvent);
      console.log('[MIGRATION] ✓ Created default event:', defaultEvent.id);
    } else {
      defaultEvent = events[0];
      console.log('[MIGRATION] Using existing event for orphaned data:', defaultEvent.id);
    }
    
    // Migrate participants
    if (participantsWithoutEvent.length > 0) {
      console.log('[MIGRATION] Migrating', participantsWithoutEvent.length, 'participants to event:', defaultEvent.id);
      const updatedParticipants = allParticipants.map(p => {
        if (!p.eventId) {
          return { ...p, eventId: defaultEvent!.id };
        }
        return p;
      });
      localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(updatedParticipants));
      console.log('[MIGRATION] ✓ Participants migrated successfully');
    }
    
    // Migrate agenda items
    if (agendaWithoutEvent.length > 0) {
      console.log('[MIGRATION] Migrating', agendaWithoutEvent.length, 'agenda items to event:', defaultEvent.id);
      const updatedAgenda = allAgenda.map(a => {
        if (!a.eventId) {
          return { ...a, eventId: defaultEvent!.id };
        }
        return a;
      });
      localStorage.setItem(AGENDA_KEY, JSON.stringify(updatedAgenda));
      console.log('[MIGRATION] ✓ Agenda items migrated successfully');
    }
    
    console.log('[MIGRATION] ✓✓✓ Migration completed successfully! ✓✓✓');
    console.log('[MIGRATION] Final state:', {
      totalEvents: getAllEvents().length,
      totalParticipants: getAllParticipants().length,
      totalAgendaItems: getAllAgenda().length,
      orphanedData: 0
    });
    console.log('='.repeat(80));
  } catch (error) {
    console.error('[MIGRATION] ❌ ERROR during migration:', error);
    console.log('='.repeat(80));
  }
}

// ===== PARTICIPANT MANAGEMENT =====

export function getAllParticipants(eventId?: string): Participant[] {
  try {
    const data = localStorage.getItem(PARTICIPANTS_KEY);
    const allParticipants = data ? JSON.parse(data) : [];
    
    // Filter by event ID if provided
    if (eventId) {
      return allParticipants.filter((p: Participant) => p.eventId === eventId);
    }
    
    return allParticipants;
  } catch (error) {
    console.error('Error reading participants from localStorage:', error);
    return [];
  }
}

export function saveParticipant(participant: Participant): void {
  const allParticipants = getAllParticipants();
  
  // Check if email already exists for this event
  const existingIndex = allParticipants.findIndex(
    p => p.email === participant.email && p.eventId === participant.eventId
  );
  if (existingIndex >= 0) {
    throw new Error('Email already registered for this event');
  }
  
  allParticipants.push(participant);
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(allParticipants));
}

export function updateParticipant(id: string, updates: Partial<Participant>): void {
  const participants = getAllParticipants();
  const index = participants.findIndex(p => p.id === id);
  
  if (index === -1) {
    throw new Error('Participant not found');
  }
  
  participants[index] = { ...participants[index], ...updates };
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
}

export function deleteParticipant(id: string): void {
  const participants = getAllParticipants();
  const filtered = participants.filter(p => p.id !== id);
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(filtered));
}

export function getParticipantById(id: string): Participant | null {
  const participants = getAllParticipants();
  return participants.find(p => p.id === id) || null;
}

export function recordAttendance(participantId: string, agendaItem: string): void {
  console.log('[ATTENDANCE] Recording attendance for participant:', participantId, 'at:', agendaItem);
  
  const participants = getAllParticipants();
  const participant = participants.find(p => p.id === participantId);
  
  if (!participant) {
    console.error('[ATTENDANCE] Participant not found:', participantId);
    throw new Error('Participant not found');
  }
  
  // Check if already checked in
  const alreadyCheckedIn = participant.attendance?.some(a => a.agendaItem === agendaItem);
  if (alreadyCheckedIn) {
    console.warn('[ATTENDANCE] Participant already checked in to this session');
  }
  
  const attendanceRecord = {
    agendaItem,
    timestamp: new Date().toISOString(),
  };
  
  participant.attendance = participant.attendance || [];
  participant.attendance.push(attendanceRecord);
  
  console.log('[ATTENDANCE] Saving updated participant list to localStorage...');
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
  
  console.log('[ATTENDANCE] Attendance recorded successfully!');
  
  // Dispatch a custom event for same-tab updates
  window.dispatchEvent(new CustomEvent('participantsUpdated', { 
    detail: { participantId, agendaItem, timestamp: attendanceRecord.timestamp }
  }));
}

// ===== AGENDA MANAGEMENT =====

export function getAllAgenda(eventId?: string): AgendaItem[] {
  try {
    const data = localStorage.getItem(AGENDA_KEY);
    const allAgenda = data ? JSON.parse(data) : [];
    
    // Filter by event ID if provided
    if (eventId) {
      return allAgenda.filter((a: AgendaItem) => a.eventId === eventId);
    }
    
    return allAgenda;
  } catch (error) {
    console.error('Error reading agenda from localStorage:', error);
    return [];
  }
}

export function saveAgendaItem(agendaItem: AgendaItem): void {
  const allAgenda = getAllAgenda();
  allAgenda.push(agendaItem);
  localStorage.setItem(AGENDA_KEY, JSON.stringify(allAgenda));
}

export function updateAgendaItem(id: string, updates: Partial<AgendaItem>): void {
  const agenda = getAllAgenda();
  const index = agenda.findIndex(a => a.id === id);
  
  if (index === -1) {
    throw new Error('Agenda item not found');
  }
  
  agenda[index] = { ...agenda[index], ...updates };
  localStorage.setItem(AGENDA_KEY, JSON.stringify(agenda));
}

export function deleteAgendaItem(id: string): void {
  const agenda = getAllAgenda();
  const filtered = agenda.filter(a => a.id !== id);
  localStorage.setItem(AGENDA_KEY, JSON.stringify(filtered));
}

export function bulkImportParticipants(
  participants: Partial<Participant>[], 
  eventId: string
): { imported: number; failed: number } {
  const existingParticipants = getAllParticipants();
  let imported = 0;
  let failed = 0;
  
  participants.forEach(p => {
    try {
      if (!p.name || !p.email) {
        failed++;
        return;
      }
      
      // Check if email already exists for this event
      if (existingParticipants.some(
        existing => existing.email === p.email && existing.eventId === eventId
      )) {
        failed++;
        return;
      }
      
      const participant: Participant = {
        id: generateParticipantId(),
        eventId: eventId,
        name: p.name,
        email: p.email,
        phone: p.phone || '',
        company: p.company || '',
        position: p.position || '',
        registeredAt: new Date().toISOString(),
        attendance: [],
      };
      
      existingParticipants.push(participant);
      imported++;
    } catch (error) {
      failed++;
    }
  });
  
  localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(existingParticipants));
  
  return { imported, failed };
}
