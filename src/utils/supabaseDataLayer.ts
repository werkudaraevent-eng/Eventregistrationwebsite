/**
 * Supabase Data Layer - Centralized Event Management Storage
 * 
 * This module provides a centralized data storage layer using Supabase database tables
 * instead of localStorage. This allows:
 * 
 * 1. Cross-device access: Any device can access event data via URL
 * 2. Public standalone pages: Registration and check-in pages work independently
 * 3. No authentication required: Uses public access with event-scoped security
 * 4. Real-time updates: Multiple organizers can collaborate on the same event
 * 
 * Architecture:
 * - Events, Participants, and Agenda items are stored in Supabase tables
 * - Event IDs in URLs provide access context
 * - Branding settings stored as JSON in events table
 * - No session/cookie dependency for public pages
 */

import { supabase } from './supabase/client';

export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
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

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  createdAt: string;
  customFields?: CustomField[];
  columnVisibility?: ColumnVisibility;
  branding?: BrandingSettings;
}

export interface Participant {
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

export interface AgendaItem {
  id: string;
  eventId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  createdAt: string;
}

// ===== HELPER FUNCTIONS =====

/**
 * ID Generation System
 * 
 * Format: [PREFIX]-[TIMESTAMP]-[RANDOM]
 * Examples:
 * - Event: evt-1730900000-abc123d4
 * - Participant: prt-1730900000-xyz789w2
 * - Agenda: agd-1730900000-efg456h8
 */

// Generate random alphanumeric string
function generateRandomSuffix(length: number = 8): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get timestamp in seconds (shorter than milliseconds)
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

export function generateEventId(): string {
  // Format: evt-[10-digit-timestamp]-[8-char-random]
  // Example: evt-1730900000-abc123d4
  return `evt-${getTimestamp()}-${generateRandomSuffix(8)}`;
}

export function generateParticipantId(): string {
  // Format: prt-[10-digit-timestamp]-[8-char-random]
  // Example: prt-1730900000-xyz789w2
  return `prt-${getTimestamp()}-${generateRandomSuffix(8)}`;
}

export function generateAgendaId(): string {
  // Format: agd-[10-digit-timestamp]-[8-char-random]
  // Example: agd-1730900000-efg456h8
  return `agd-${getTimestamp()}-${generateRandomSuffix(8)}`;
}

export function generateCustomFieldId(): string {
  // Format: fld-[10-digit-timestamp]-[8-char-random]
  // Example: fld-1730900000-qwe123r5
  return `fld-${getTimestamp()}-${generateRandomSuffix(8)}`;
}

/**
 * Parse ID to extract information
 * Returns: { prefix, timestamp, random }
 */
export function parseId(id: string): { prefix: string; timestamp: string; random: string } | null {
  const match = id.match(/^([a-z]{3})-(\d{10})-([a-z0-9]{8})$/);
  if (!match) return null;
  
  return {
    prefix: match[1],
    timestamp: match[2],
    random: match[3]
  };
}

/**
 * Get readable date from ID
 */
export function getIdDate(id: string): Date | null {
  const parsed = parseId(id);
  if (!parsed) return null;
  
  return new Date(parseInt(parsed.timestamp) * 1000);
}

// ===== EVENT MANAGEMENT =====

export async function getAllEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

export async function createEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
  const newEvent: Event = {
    id: generateEventId(),
    createdAt: new Date().toISOString(),
    ...event,
  };
  
  const { data, error } = await supabase
    .from('events')
    .insert([newEvent])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ===== PARTICIPANT MANAGEMENT =====

export async function getParticipantsByEvent(eventId: string): Promise<Participant[]> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('eventId', eventId)
      .order('registeredAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
}

export async function getParticipantById(id: string, eventId: string): Promise<Participant | null> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', id)
      .eq('eventId', eventId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching participant:', error);
    return null;
  }
}

export async function createParticipant(participant: Omit<Participant, 'id' | 'registeredAt' | 'attendance'>): Promise<Participant> {
  const newParticipant: Participant = {
    id: generateParticipantId(),
    registeredAt: new Date().toISOString(),
    attendance: [],
    ...participant,
  };
  
  const { data, error } = await supabase
    .from('participants')
    .insert([newParticipant])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateParticipant(id: string, eventId: string, updates: Partial<Participant>): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update(updates)
    .eq('id', id)
    .eq('eventId', eventId);
  
  if (error) throw error;
}

export async function deleteParticipant(id: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id)
    .eq('eventId', eventId);
  
  if (error) throw error;
}

// ===== AGENDA MANAGEMENT =====

export async function getAgendaByEvent(eventId: string): Promise<AgendaItem[]> {
  try {
    const { data, error } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('eventId', eventId)
      .order('startTime', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching agenda:', error);
    return [];
  }
}

export async function getAgendaItemById(id: string): Promise<AgendaItem | null> {
  try {
    const { data, error } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching agenda item:', error);
    return null;
  }
}

export async function createAgendaItem(item: Omit<AgendaItem, 'id' | 'createdAt'>): Promise<AgendaItem> {
  const newItem: AgendaItem = {
    id: generateAgendaId(),
    createdAt: new Date().toISOString(),
    ...item,
  };
  
  const { data, error } = await supabase
    .from('agenda_items')
    .insert([newItem])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAgendaItem(id: string, eventId: string, updates: Partial<AgendaItem>): Promise<void> {
  const { error } = await supabase
    .from('agenda_items')
    .update(updates)
    .eq('id', id)
    .eq('eventId', eventId);
  
  if (error) throw error;
}

export async function deleteAgendaItem(id: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('agenda_items')
    .delete()
    .eq('id', id)
    .eq('eventId', eventId);
  
  if (error) throw error;
}

// ===== CUSTOM FIELDS MANAGEMENT =====

export async function getCustomFields(eventId: string): Promise<CustomField[]> {
  try {
    const event = await getEventById(eventId);
    if (!event?.customFields) return [];
    
    // Sort by order
    return [...event.customFields].sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return [];
  }
}

export async function addCustomField(eventId: string, field: Omit<CustomField, 'id' | 'order'>): Promise<CustomField> {
  try {
    const event = await getEventById(eventId);
    if (!event) throw new Error('Event not found');
    
    const customFields = event.customFields || [];
    const newField: CustomField = {
      ...field,
      id: generateCustomFieldId(),
      order: customFields.length,
    };
    
    const updatedFields = [...customFields, newField];
    await updateEvent(eventId, { customFields: updatedFields });
    
    return newField;
  } catch (error) {
    console.error('Error adding custom field:', error);
    throw error;
  }
}

export async function deleteCustomField(eventId: string, fieldId: string): Promise<void> {
  try {
    const event = await getEventById(eventId);
    if (!event) throw new Error('Event not found');
    
    const customFields = (event.customFields || []).filter(f => f.id !== fieldId);
    await updateEvent(eventId, { customFields });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    throw error;
  }
}

export async function updateCustomField(eventId: string, fieldId: string, updates: Partial<CustomField>): Promise<void> {
  try {
    const event = await getEventById(eventId);
    if (!event) throw new Error('Event not found');
    
    const customFields = (event.customFields || []).map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    );
    
    await updateEvent(eventId, { customFields });
  } catch (error) {
    console.error('Error updating custom field:', error);
    throw error;
  }
}

export async function reorderCustomFields(eventId: string, fieldIds: string[]): Promise<void> {
  try {
    const event = await getEventById(eventId);
    if (!event) throw new Error('Event not found');
    
    const fieldsMap = new Map(
      (event.customFields || []).map(f => [f.id, f])
    );
    
    const reorderedFields = fieldIds
      .map(id => fieldsMap.get(id)!)
      .filter(Boolean)
      .map((f, index) => ({ ...f, order: index }));
    
    await updateEvent(eventId, { customFields: reorderedFields });
  } catch (error) {
    console.error('Error reordering custom fields:', error);
    throw error;
  }
}

// ===== BRANDING MANAGEMENT =====

export async function getBrandingSettings(eventId: string): Promise<BrandingSettings | null> {
  const event = await getEventById(eventId);
  return event?.branding || null;
}

export async function updateBrandingSettings(eventId: string, branding: BrandingSettings): Promise<void> {
  await updateEvent(eventId, { branding });
}

// ===== CHECK-IN OPERATIONS =====

export async function checkInParticipant(participantId: string, eventId: string, agendaItemId: string): Promise<void> {
  const participant = await getParticipantById(participantId, eventId);
  
  if (!participant) {
    throw new Error('Participant not found');
  }
  
  // Check if already checked in
  const existingCheckIn = participant.attendance.find(a => a.agendaItem === agendaItemId);
  if (existingCheckIn) {
    throw new Error('Participant already checked in for this session');
  }
  
  // Add check-in record
  const updatedAttendance = [
    ...participant.attendance,
    {
      agendaItem: agendaItemId,
      timestamp: new Date().toISOString(),
    },
  ];
  
  await updateParticipant(participantId, eventId, { attendance: updatedAttendance });
}

export async function getCheckedInParticipants(eventId: string, agendaItemId: string): Promise<Participant[]> {
  const allParticipants = await getParticipantsByEvent(eventId);
  return allParticipants.filter(p => 
    p.attendance.some(a => a.agendaItem === agendaItemId)
  );
}
