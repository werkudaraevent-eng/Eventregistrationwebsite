/**
 * ID Generation Testing Utility
 * 
 * Demonstrasi format ID yang baru dengan struktur yang lebih terstruktur
 */

import { 
  generateEventId, 
  generateParticipantId, 
  generateAgendaId,
  generateCustomFieldId,
  parseId,
  getIdDate
} from './supabaseDataLayer';

// Example usage
export function demonstrateIdGeneration() {
  console.log('=== NEW ID GENERATION FORMAT ===\n');
  
  // Generate sample IDs
  const eventId = generateEventId();
  const participantId = generateParticipantId();
  const agendaId = generateAgendaId();
  const fieldId = generateCustomFieldId();
  
  console.log('Event ID:', eventId);
  console.log('Participant ID:', participantId);
  console.log('Agenda ID:', agendaId);
  console.log('Custom Field ID:', fieldId);
  
  console.log('\n=== PARSING IDS ===\n');
  
  // Parse IDs
  const eventParsed = parseId(eventId);
  const participantParsed = parseId(participantId);
  
  console.log('Event parsed:', eventParsed);
  console.log('Participant parsed:', participantParsed);
  
  console.log('\n=== EXTRACTING DATES ===\n');
  
  // Get dates from IDs
  const eventDate = getIdDate(eventId);
  const participantDate = getIdDate(participantId);
  
  console.log('Event created at:', eventDate?.toLocaleString());
  console.log('Participant registered at:', participantDate?.toLocaleString());
  
  console.log('\n=== ID STRUCTURE ===\n');
  console.log('Format: [PREFIX]-[TIMESTAMP]-[RANDOM]');
  console.log('Prefix (3 chars): evt, prt, agd, fld');
  console.log('Timestamp (10 digits): Unix timestamp in seconds');
  console.log('Random (8 chars): Random alphanumeric for uniqueness');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateIdGeneration();
}
