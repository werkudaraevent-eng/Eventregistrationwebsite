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

export interface PaperSizeConfiguration {
  sizeType: 'CR80' | 'A4' | 'A5' | 'A6' | 'A7' | 'Letter' | 'B1' | 'B2' | 'B3' | 'B4' | 'A1_ID' | 'A2_ID' | 'A3_ID' | 'THERMAL_80' | 'THERMAL_80_LONG' | 'THERMAL_80_SHORT' | 'THERMAL_58' | 'Custom';
  orientation: 'portrait' | 'landscape';
  customWidth?: number;  // in mm
  customHeight?: number; // in mm
  margins: {
    top: number;    // in mm
    right: number;  // in mm
    bottom: number; // in mm
    left: number;   // in mm
  };
  printRotation?: 0 | 90; // Rotate badge output when printing (0° = no rotation, 90° = rotate clockwise)
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
  size?: 'CR80' | 'B1' | 'B2' | 'B3' | 'B4' | 'A1' | 'A2' | 'A3' | 'A6' | 'A7' | 'custom';
  customWidth?: number;
  customHeight?: number;
  backgroundImageUrl?: string;
  backgroundImageFit?: 'cover' | 'contain';
  logoUrl?: string;
  components?: any[];
  // Print configuration
  printConfiguration?: PaperSizeConfiguration;
}

// Paper size definitions (dimensions in mm)
// All sizes stored in portrait orientation (width < height)
// User can toggle orientation via OrientationSelector
export const PAPER_SIZES = {
  // Standard paper sizes for printing
  A4: { width: 210, height: 297, label: 'A4 Paper' },
  A5: { width: 148, height: 210, label: 'A5 Paper' },
  A6: { width: 105, height: 148, label: 'A6 Paper' },
  A7: { width: 74, height: 105, label: 'A7 Paper' },
  Letter: { width: 215.9, height: 279.4, label: 'Letter (US)' },
  // Badge/ID Card sizes
  CR80: { width: 53.98, height: 85.6, label: 'CR80 (Credit Card)' },
  // Indonesian ID Card Holder Sizes (B Series)
  B1: { width: 55, height: 85, label: 'B1 (55×85mm)' },
  B2: { width: 65, height: 105, label: 'B2 (65×105mm)' },
  B3: { width: 80, height: 105, label: 'B3 (80×105mm)' },
  B4: { width: 90, height: 130, label: 'B4 (90×130mm)' },
  // Indonesian ID Card Holder Sizes (A Series)
  A1_ID: { width: 55, height: 90, label: 'A1 ID (55×90mm)' },
  A2_ID: { width: 65, height: 95, label: 'A2 ID (65×95mm)' },
  A3_ID: { width: 80, height: 100, label: 'A3 ID (80×100mm)' },
  // Thermal Receipt Printer Sizes (POS Printers like Epson TM-T82X)
  THERMAL_80: { width: 72, height: 100, label: 'Thermal 80mm (72×100mm)' },
  THERMAL_80_LONG: { width: 72, height: 150, label: 'Thermal 80mm Long (72×150mm)' },
  THERMAL_80_SHORT: { width: 72, height: 60, label: 'Thermal 80mm Short (72×60mm)' },
  THERMAL_58: { width: 48, height: 80, label: 'Thermal 58mm (48×80mm)' },
  Custom: { width: 100, height: 150, label: 'Custom Size' }
} as const;

// Default print configuration
export const DEFAULT_PRINT_CONFIG: PaperSizeConfiguration = {
  sizeType: 'A4',
  orientation: 'portrait',
  margins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  }
};

// Thermal printer preset (for POS printers like Epson TM-T82X)
// Thermal printers have minimal hardware margins, so software margins should be small
export const THERMAL_PRINT_CONFIG: PaperSizeConfiguration = {
  sizeType: 'THERMAL_80',
  orientation: 'portrait',
  margins: {
    top: 2,
    right: 0,
    bottom: 2,
    left: 0
  }
};

// Helper to get recommended margins for paper size type
// Optional customWidth parameter to detect small paper sizes
export function getRecommendedMargins(
  sizeType: PaperSizeConfiguration['sizeType'],
  customWidth?: number
): PaperSizeConfiguration['margins'] {
  // Thermal printers have hardware margins, so minimal software margins needed
  if (sizeType.startsWith('THERMAL_')) {
    return { top: 2, right: 0, bottom: 2, left: 0 };
  }
  // ID cards typically need minimal margins
  if (['CR80', 'B1', 'B2', 'B3', 'B4', 'A1_ID', 'A2_ID', 'A3_ID'].includes(sizeType)) {
    return { top: 2, right: 2, bottom: 2, left: 2 };
  }
  // Custom size - use minimal margins for small sizes (< 100mm width)
  if (sizeType === 'Custom') {
    if (customWidth && customWidth < 100) {
      return { top: 2, right: 2, bottom: 2, left: 2 };
    }
    return { top: 5, right: 5, bottom: 5, left: 5 };
  }
  // Standard paper sizes (A4, A5, Letter, etc.)
  return { top: 10, right: 10, bottom: 10, left: 10 };
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
