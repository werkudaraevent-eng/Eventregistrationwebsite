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
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
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

export async function createParticipant(participant: Omit<Participant, 'id' | 'registeredAt'>): Promise<Participant> {
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
