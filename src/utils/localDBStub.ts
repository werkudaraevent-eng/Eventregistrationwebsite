/**
 * LocalDB Stub - Temporary compatibility layer
 * This file provides stub implementations for all localDB functions
 * to maintain compatibility while we transition to Supabase.
 * 
 * TODO: Replace these stub functions with actual Supabase queries
 */

// Type definitions (from old localStorage.ts)
export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  customFields?: CustomField[];
  createdAt?: string;
  branding?: { logoUrl?: string };
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
  room?: string;
  speakers?: string[];
  order: number;
  createdAt: string;
}

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
  logoSize: 'small' | 'medium' | 'large';
  logoAlignment: 'left' | 'center' | 'right';
  customHeader?: string;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  // Enhanced appearance settings
  fontColor?: string;
  buttonColor?: string;
  buttonText?: string;
  formWidth?: 'narrow' | 'medium' | 'wide';
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  fontSize?: 'small' | 'medium' | 'large';
  successMessage?: string;
  footerText?: string;
  footerColor?: string; // New: Footer text color
  // Header display settings
  showDate?: boolean; // Show event date in header
  showLocation?: boolean; // Show event location in header
  showDescription?: boolean; // Show event description in header
  // Email confirmation settings
  autoSendConfirmation?: boolean; // Auto send confirmation email after registration
  confirmationTemplateId?: string; // Email template ID for confirmation
}

export interface BadgeSettings {
  templateId?: string;
  showQR: boolean;
  showAttendance: boolean;
  customMessage?: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  // Extended properties for BadgeDesigner
  size?: 'CR80' | 'A6' | 'A7' | 'custom';
  customWidth?: number;
  customHeight?: number;
  backgroundImageUrl?: string;
  backgroundImageFit?: 'cover' | 'contain';
  logoUrl?: string;
  components?: any[];
}

// Stub functions - TODO: Replace with Supabase queries
const localDB = {
  // Event functions
  getAllEvents: (): Event[] => {
    console.warn('[STUB] getAllEvents - Not implemented, returning empty array');
    return [];
  },
  getEventById: (id: string): Event | null => {
    console.warn('[STUB] getEventById - Not implemented');
    return null;
  },
  getSelectedEventId: (): string | null => {
    console.warn('[STUB] getSelectedEventId - Not implemented');
    return null;
  },

  // Participant functions
  getAllParticipants: (eventId?: string): Participant[] => {
    console.warn('[STUB] getAllParticipants - Not implemented');
    return [];
  },
  getParticipantsByEvent: (eventId: string): Participant[] => {
    console.warn('[STUB] getParticipantsByEvent - Not implemented');
    return [];
  },
  getParticipantById: (id: string): Participant | null => {
    console.warn('[STUB] getParticipantById - Not implemented');
    return null;
  },
  saveParticipant: (participant: Participant): void => {
    console.warn('[STUB] saveParticipant - Not implemented');
  },
  deleteParticipant: (id: string): void => {
    console.warn('[STUB] deleteParticipant - Not implemented');
  },
  generateParticipantId: (): string => {
    console.warn('[STUB] generateParticipantId - Returning random ID');
    return 'P_' + Math.random().toString(36).substr(2, 9);
  },
  bulkImportParticipants: (participants: Participant[], eventId: string): { success: number; failed: number } => {
    console.warn('[STUB] bulkImportParticipants - Not implemented');
    return { success: 0, failed: participants.length };
  },
  recordAttendance: (participantId: string, agendaItemTitle: string): void => {
    console.warn('[STUB] recordAttendance - Not implemented');
  },

  // Agenda functions
  getAllAgenda: (eventId?: string): AgendaItem[] => {
    console.warn('[STUB] getAllAgenda - Not implemented');
    return [];
  },
  getAgendaByEvent: (eventId: string): AgendaItem[] => {
    console.warn('[STUB] getAgendaByEvent - Not implemented');
    return [];
  },
  saveAgendaItem: (agenda: AgendaItem): void => {
    console.warn('[STUB] saveAgendaItem - Not implemented');
  },
  updateAgendaItem: (id: string, data: Partial<AgendaItem>): void => {
    console.warn('[STUB] updateAgendaItem - Not implemented');
  },
  deleteAgendaItem: (id: string): void => {
    console.warn('[STUB] deleteAgendaItem - Not implemented');
  },
  generateAgendaId: (): string => {
    console.warn('[STUB] generateAgendaId - Returning random ID');
    return 'A_' + Math.random().toString(36).substr(2, 9);
  },

  // Custom Fields
  addCustomField: (eventId: string, field: CustomField): void => {
    console.warn('[STUB] addCustomField - Not implemented');
  },
  deleteCustomField: (eventId: string, fieldId: string): void => {
    console.warn('[STUB] deleteCustomField - Not implemented');
  },
  reorderCustomFields: (eventId: string, fieldIds: string[]): void => {
    console.warn('[STUB] reorderCustomFields - Not implemented');
  },
  generateCustomFieldId: (): string => {
    console.warn('[STUB] generateCustomFieldId - Returning random ID');
    return 'CF_' + Math.random().toString(36).substr(2, 9);
  },

  // Column Visibility
  getColumnVisibility: (eventId: string): ColumnVisibility => {
    console.warn('[STUB] getColumnVisibility - Returning defaults');
    return { phone: true, company: true, position: true, attendance: true, registered: true };
  },
  updateColumnVisibility: (eventId: string, visibility: Partial<ColumnVisibility>): void => {
    console.warn('[STUB] updateColumnVisibility - Not implemented');
  },

  // Branding Settings
  getBrandingSettings: (eventId: string): BrandingSettings => {
    console.warn('[STUB] getBrandingSettings - Returning defaults');
    return {
      logoSize: 'medium',
      logoAlignment: 'left',
      primaryColor: '#7C3AED',
      backgroundColor: '#FFFFFF',
      fontFamily: 'sans-serif'
    };
  },
  updateBrandingSettings: (eventId: string, settings: BrandingSettings): void => {
    console.warn('[STUB] updateBrandingSettings - Not implemented');
  },

  // Badge Settings
  getBadgeSettings: (eventId: string): BadgeSettings => {
    console.warn('[STUB] getBadgeSettings - Returning defaults');
    return {
      showQR: true,
      showAttendance: true,
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      accentColor: '#7C3AED'
    };
  },
  updateBadgeSettings: (eventId: string, settings: BadgeSettings): void => {
    console.warn('[STUB] updateBadgeSettings - Not implemented');
  },
};

export default localDB;
export * from './localDBStub';
