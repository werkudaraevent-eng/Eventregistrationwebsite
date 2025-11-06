/**
 * Data Migration Utility
 * 
 * Migrates existing localStorage data to Supabase database
 * This enables cross-device access and resolves the architectural flaw
 * where standalone pages couldn't access data from different browsers.
 */

import * as localDB from './localStorage';
import * as supabaseDB from './supabaseDataLayer';
import { supabase } from './supabase/client';

export interface MigrationStatus {
  success: boolean;
  eventsCreated: number;
  participantsCreated: number;
  agendaItemsCreated: number;
  errors: string[];
}

/**
 * Checks if Supabase tables are set up correctly
 */
export async function checkSupabaseSetup(): Promise<boolean> {
  try {
    // Try to query the events table
    const { error } = await supabase
      .from('events')
      .select('count')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.error('Supabase setup check failed:', error);
    return false;
  }
}

/**
 * Migrates all localStorage data to Supabase
 */
export async function migrateToSupabase(): Promise<MigrationStatus> {
  const status: MigrationStatus = {
    success: false,
    eventsCreated: 0,
    participantsCreated: 0,
    agendaItemsCreated: 0,
    errors: [],
  };
  
  try {
    // Check if Supabase is set up
    const isSetup = await checkSupabaseSetup();
    if (!isSetup) {
      status.errors.push('Supabase tables not set up. Please run the migration SQL first.');
      return status;
    }
    
    // Get all events from localStorage
    const events = localDB.getAllEvents();
    
    if (events.length === 0) {
      status.errors.push('No events found in localStorage to migrate.');
      return status;
    }
    
    console.log(`[MIGRATION] Found ${events.length} events to migrate...`);
    
    // Migrate each event
    for (const event of events) {
      try {
        // Check if event already exists in Supabase
        const existingEvent = await supabaseDB.getEventById(event.id);
        
        if (!existingEvent) {
          // Create event in Supabase
          await supabase.from('events').insert([event]);
          status.eventsCreated++;
          console.log(`[MIGRATION] Migrated event: ${event.name}`);
        } else {
          console.log(`[MIGRATION] Event already exists: ${event.name}`);
        }
        
        // Migrate participants for this event
        const participants = localDB.getParticipantsByEvent(event.id);
        for (const participant of participants) {
          try {
            const existingParticipant = await supabaseDB.getParticipantById(participant.id, event.id);
            if (!existingParticipant) {
              await supabase.from('participants').insert([participant]);
              status.participantsCreated++;
            }
          } catch (error: any) {
            status.errors.push(`Failed to migrate participant ${participant.name}: ${error.message}`);
          }
        }
        
        // Migrate agenda items for this event
        const agendaItems = localDB.getAgendaByEvent(event.id);
        for (const item of agendaItems) {
          try {
            const existingItem = await supabaseDB.getAgendaItemById(item.id);
            if (!existingItem) {
              await supabase.from('agenda_items').insert([item]);
              status.agendaItemsCreated++;
            }
          } catch (error: any) {
            status.errors.push(`Failed to migrate agenda item ${item.title}: ${error.message}`);
          }
        }
        
      } catch (error: any) {
        status.errors.push(`Failed to migrate event ${event.name}: ${error.message}`);
      }
    }
    
    status.success = status.eventsCreated > 0 || status.participantsCreated > 0 || status.agendaItemsCreated > 0;
    
    console.log('[MIGRATION] Migration complete:', status);
    
  } catch (error: any) {
    status.errors.push(`Migration failed: ${error.message}`);
    console.error('[MIGRATION] Error:', error);
  }
  
  return status;
}

/**
 * Exports localStorage data to JSON for backup
 */
export function exportLocalStorageData(): string {
  const events = localDB.getAllEvents();
  const allParticipants: any[] = [];
  const allAgendaItems: any[] = [];
  
  events.forEach(event => {
    const participants = localDB.getParticipantsByEvent(event.id);
    const agendaItems = localDB.getAgendaByEvent(event.id);
    allParticipants.push(...participants);
    allAgendaItems.push(...agendaItems);
  });
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    events,
    participants: allParticipants,
    agendaItems: allAgendaItems,
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Downloads the localStorage data as a JSON file
 */
export function downloadBackup(): void {
  const data = exportLocalStorageData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `event-registration-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Check if user has localStorage data that needs migration
 */
export function hasLocalStorageData(): boolean {
  const events = localDB.getAllEvents();
  return events.length > 0;
}

/**
 * Check if Supabase has any data
 */
export async function hasSupabaseData(): Promise<boolean> {
  try {
    const events = await supabaseDB.getAllEvents();
    return events.length > 0;
  } catch (error) {
    return false;
  }
}
