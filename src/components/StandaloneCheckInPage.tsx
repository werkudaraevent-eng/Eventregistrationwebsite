/**
 * StandaloneCheckInPage - Event-Scoped Check-In Interface
 * 
 * SECURITY NOTICE:
 * This component implements strict event-based data isolation. All participant data,
 * check-in operations, and statistics are filtered by the event that owns the agenda item.
 * 
 * Data Isolation Features:
 * 1. Participants are loaded ONLY from the event associated with the agenda item
 * 2. Check-in operations validate that participants belong to the correct event
 * 3. All counts and statistics reflect only the scoped event's data
 * 4. Cross-event check-ins are prevented with security validation
 * 5. Missing eventId configuration triggers error states
 * 
 * Security Checkpoints:
 * - fetchAgenda(): Validates agenda has eventId before proceeding
 * - fetchParticipants(): Only loads participants matching agenda.eventId
 * - handleCheckIn(): Validates participant.eventId matches agenda.eventId
 * - Auto-refresh: All updates maintain event scope
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Search, QrCode, BarChart3, Loader2, CheckCircle2, X, Camera, Clock, AlertCircle, Printer, Settings } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCodeLib from 'qrcode';
import * as localDB from '../utils/localStorage';

type AgendaItem = localDB.AgendaItem;
type Participant = localDB.Participant;

interface StandaloneCheckInPageProps {
  agendaId: string;
}

type Event = localDB.Event;

export function StandaloneCheckInPage({ agendaId }: StandaloneCheckInPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [agenda, setAgenda] = useState<AgendaItem | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [checkedInParticipants, setCheckedInParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoPrintBadge, setAutoPrintBadge] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const loadData = async () => {
      console.log('='.repeat(80));
      console.log('[STANDALONE CHECK-IN] Page loaded for agenda ID:', agendaId);
      console.log('[STANDALONE CHECK-IN] Initializing with strict event isolation...');
      console.log('='.repeat(80));
      await fetchAgenda();
      await fetchParticipants();
    };
    loadData();
    
    return () => {
      stopCamera();
    };
  }, [agendaId]);

  // Re-fetch participants when agenda changes (to apply eventId filter)
  useEffect(() => {
    if (agenda) {
      fetchParticipants();
    }
  }, [agenda?.id]);

  // Auto-refresh: Listen for localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      console.log('[AUTO-REFRESH] Storage event detected:', e.key);
      if (e.key === 'event_participants' || e.key === 'event_agenda') {
        console.log('[AUTO-REFRESH] Data changed, refreshing with event scope...');
        if (agenda?.eventId) {
          console.log('[SECURITY] Auto-refresh scoped to event:', agenda.eventId);
        }
        fetchParticipants();
        if (e.key === 'event_agenda') {
          fetchAgenda();
        }
      }
    };

    // Custom event listener for same-tab updates (instant)
    const handleParticipantsUpdated = (e: Event) => {
      console.log('[AUTO-REFRESH] Custom participantsUpdated event detected');
      if (agenda?.eventId) {
        console.log('[SECURITY] Custom event refresh scoped to event:', agenda.eventId);
      }
      fetchParticipants();
    };

    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('participantsUpdated', handleParticipantsUpdated);

    // Polling mechanism for same-tab updates (every 3 seconds)
    const pollInterval = setInterval(() => {
      console.log('[AUTO-REFRESH] Polling for updates...');
      if (agenda?.eventId) {
        console.log('[SECURITY] Poll refresh scoped to event:', agenda.eventId);
      }
      fetchParticipants();
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('participantsUpdated', handleParticipantsUpdated);
      clearInterval(pollInterval);
    };
  }, [agenda?.eventId]);

  // Update checked-in participants when agenda or participants change
  useEffect(() => {
    if (agenda && participants.length > 0) {
      const checkedIn = participants.filter((p: Participant) =>
        p.attendance && p.attendance.some(a => a.agendaItem === agenda.title)
      );
      setCheckedInParticipants(checkedIn);
    }
  }, [agenda, participants]);

  const fetchAgenda = async () => {
    setIsLoading(true);
    try {
      console.log('[SECURITY] Fetching agenda item by ID:', agendaId);
      const allAgenda = localDB.getAllAgenda();
      
      const foundAgenda = allAgenda.find((a: AgendaItem) => a.id === agendaId);
      if (!foundAgenda) {
        console.error('[SECURITY] Agenda item not found:', agendaId);
        setError('Agenda item not found');
        return;
      }
      
      // CRITICAL SECURITY CHECK: Ensure agenda has eventId
      if (!foundAgenda.eventId) {
        console.error('[SECURITY] CRITICAL: Agenda item missing eventId!', foundAgenda);
        setError('Invalid agenda configuration - missing event association');
        return;
      }
      
      console.log('[SECURITY] Agenda item loaded. Event ID:', foundAgenda.eventId);
      setAgenda(foundAgenda);
      
      // Load the associated event details for display
      const associatedEvent = localDB.getEventById(foundAgenda.eventId);
      if (associatedEvent) {
        console.log('[SECURITY] Event details loaded:', associatedEvent.name);
        setEvent(associatedEvent);
      } else {
        console.warn('[SECURITY] Event not found for eventId:', foundAgenda.eventId);
      }
    } catch (err: any) {
      console.error('[SECURITY] Error fetching agenda:', err);
      setError('Failed to load agenda');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      // CRITICAL SECURITY CHECK: Must have agenda with eventId before fetching participants
      if (!agenda) {
        console.warn('[SECURITY] Cannot fetch participants - agenda not loaded yet');
        return;
      }
      
      if (!agenda.eventId) {
        console.error('[SECURITY] CRITICAL: Cannot fetch participants - agenda missing eventId!');
        setError('Security error: Invalid event configuration');
        return;
      }
      
      console.log('[SECURITY] Fetching participants ONLY for event:', agenda.eventId);
      
      // STRICT EVENT ISOLATION: Only get participants from this specific event
      const eventParticipants = localDB.getAllParticipants(agenda.eventId);
      
      console.log('[SECURITY] Successfully filtered participants by eventId:', {
        eventId: agenda.eventId,
        participantCount: eventParticipants.length,
        agendaTitle: agenda.title
      });
      
      // Verify all participants belong to this event
      const invalidParticipants = eventParticipants.filter(p => p.eventId !== agenda.eventId);
      if (invalidParticipants.length > 0) {
        console.error('[SECURITY] CRITICAL: Found participants from other events!', invalidParticipants);
      } else {
        console.log('[SECURITY] ✓ All participants verified to belong to event:', agenda.eventId);
      }
      
      setParticipants(eventParticipants);
      setLastUpdated(new Date());
      
      // Update checked-in participants for this specific session
      const checkedIn = eventParticipants.filter(p => 
        p.attendance && p.attendance.some(a => a.agendaItem === agenda.title)
      );
      
      console.log('[SECURITY] Checked-in count for this session:', checkedIn.length);
      console.log('[SECURITY] Data isolation summary:', {
        eventId: agenda.eventId,
        eventName: event?.name || 'Loading...',
        sessionTitle: agenda.title,
        totalParticipantsInEvent: eventParticipants.length,
        checkedInToThisSession: checkedIn.length,
        dataIsolationVerified: invalidParticipants.length === 0
      });
      console.log('='.repeat(80));
      
      setCheckedInParticipants(checkedIn);
      
    } catch (err: any) {
      console.error('[SECURITY] Error fetching participants:', err);
      setError('Failed to load participants');
    }
  };

  const printBadge = async (participant: Participant) => {
    if (!event || !agenda) return;
    
    try {
      const badgeSettings = localDB.getBadgeSettings(event.id);
      
      // Try to load canvas layout
      const canvasLayoutStr = localStorage.getItem(`badge_canvas_${event.id}`);
      const canvasLayout = canvasLayoutStr ? JSON.parse(canvasLayoutStr) : null;
      
      // Generate QR code for participant
      const qrCodeUrl = await QRCodeLib.toDataURL(participant.id, {
        width: 300,
        margin: 1
      });
      
      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print badges');
        return;
      }
      
      // Get badge dimensions
      const BADGE_SIZES: any = {
        CR80: { width: 85.6, height: 53.98 },
        A6: { width: 105, height: 148 },
        A7: { width: 74, height: 105 },
        custom: { width: badgeSettings.customWidth || 100, height: badgeSettings.customHeight || 150 }
      };
      
      const selectedSize = BADGE_SIZES[badgeSettings.size];
      const width = selectedSize.width;
      const height = selectedSize.height;
      
      let badgeContent = '';
      let badgeStyles = '';
      
      // Use canvas layout if available (new drag-and-drop design)
      if (canvasLayout && canvasLayout.length > 0) {
        const backgroundImageStyle = badgeSettings.backgroundImageUrl 
          ? `background-image: url(${badgeSettings.backgroundImageUrl});
             background-size: ${badgeSettings.backgroundImageFit || 'cover'};
             background-position: center;
             background-repeat: no-repeat;`
          : '';
        
        badgeStyles = `
          .badge {
            width: ${width}mm;
            height: ${height}mm;
            background-color: ${badgeSettings.backgroundColor};
            ${backgroundImageStyle}
            box-sizing: border-box;
            position: relative;
            border: 1px solid #ddd;
          }
          .badge-component {
            position: absolute;
            overflow: hidden;
          }
        `;
        
        canvasLayout
          .filter((c: any) => c.enabled)
          .forEach((component: any) => {
            const componentStyle = `
              left: ${component.x}%;
              top: ${component.y}%;
              width: ${component.width}%;
              height: ${component.height}%;
              font-size: ${component.fontSize || 16}px;
              font-family: ${component.fontFamily || 'sans-serif'};
              font-weight: ${component.fontWeight || 'normal'};
              font-style: ${component.fontStyle || 'normal'};
              text-align: ${component.textAlign || 'left'};
              color: ${component.color || '#000000'};
              display: flex;
              align-items: center;
            `;
            
            if (component.type === 'eventName') {
              badgeContent += `<div class="badge-component" style="${componentStyle}">${event.name}</div>`;
            } else if (component.type === 'field' && component.fieldName) {
              const value = component.fieldName.startsWith('custom_') 
                ? participant.customData?.[component.fieldName] 
                : (participant as any)[component.fieldName];
              badgeContent += `
                <div class="badge-component" style="${componentStyle}">
                  <div style="width: 100%;">
                    <div style="opacity: 0.6; font-size: 0.7em;">${component.label}</div>
                    <div>${value || '-'}</div>
                  </div>
                </div>
              `;
            } else if (component.type === 'qrcode') {
              badgeContent += `
                <div class="badge-component" style="${componentStyle} justify-content: center;">
                  <img src="${qrCodeUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>
              `;
            } else if (component.type === 'logo') {
              const logoUrl = badgeSettings.logoUrl || event.branding?.logoUrl;
              if (logoUrl) {
                badgeContent += `
                  <div class="badge-component" style="${componentStyle} justify-content: center;">
                    <img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
                  </div>
                `;
              }
            } else if (component.type === 'customText') {
              badgeContent += `<div class="badge-component" style="${componentStyle}">${component.customText || 'Custom Text'}</div>`;
            }
          });
      } else {
        // Fallback to old sequential layout
        const fontSizes: any = {
          small: { title: '14px', text: '12px' },
          medium: { title: '18px', text: '14px' },
          large: { title: '24px', text: '18px' }
        };
        
        const qrSizes: any = {
          small: '60px',
          medium: '80px',
          large: '100px'
        };
        
        badgeStyles = `
          .badge {
            width: ${width}mm;
            height: ${height}mm;
            background-color: ${badgeSettings.backgroundColor};
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: ${badgeSettings.alignment === 'left' ? 'flex-start' : badgeSettings.alignment === 'right' ? 'flex-end' : 'center'};
            text-align: ${badgeSettings.alignment};
            border: 1px solid #ddd;
          }
        `;
        
        badgeSettings.components
          .filter(c => c.enabled)
          .sort((a, b) => a.order - b.order)
          .forEach(component => {
            if (component.type === 'eventName') {
              badgeContent += `<div style="font-size: ${fontSizes[badgeSettings.fontSize].title}; font-weight: bold; margin: 8px 0;">${event.name}</div>`;
            } else if (component.type === 'field' && component.fieldName) {
              const value = component.fieldName.startsWith('custom_') 
                ? participant.customData?.[component.fieldName] 
                : (participant as any)[component.fieldName];
              badgeContent += `
                <div style="margin: 8px 0;">
                  <div style="font-size: ${fontSizes[badgeSettings.fontSize].text}; opacity: 0.7;">${component.label}</div>
                  <div style="font-size: ${fontSizes[badgeSettings.fontSize].text};">${value || '-'}</div>
                </div>
              `;
            } else if (component.type === 'qrcode') {
              badgeContent += `<img src="${qrCodeUrl}" style="width: ${qrSizes[badgeSettings.qrCodeSize]}; height: ${qrSizes[badgeSettings.qrCodeSize]}; margin: 8px 0;" />`;
            } else if (component.type === 'logo' && badgeSettings.logoUrl) {
              badgeContent += `<img src="${badgeSettings.logoUrl}" style="max-width: 100px; max-height: 40px; object-fit: contain; margin: 8px 0;" />`;
            }
          });
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Badge - ${participant.name}</title>
            <style>
              @media print {
                @page {
                  size: ${width}mm ${height}mm;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              ${badgeStyles}
            </style>
          </head>
          <body>
            <div class="badge">
              ${badgeContent}
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Error printing badge:', error);
      alert('Failed to print badge');
    }
  };

  const openBadgeDesigner = () => {
    if (!event) return;
    const designerUrl = new URL(window.location.origin + window.location.pathname);
    designerUrl.searchParams.set('designer', event.id);
    window.open(designerUrl.toString(), '_blank', 'noopener');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = participants.filter(p =>
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.email?.toLowerCase().includes(lowerQuery) ||
      p.company?.toLowerCase().includes(lowerQuery)
    );
    console.log('Search results:', results);
    setSearchResults(results);
  };

  const openSearchDialog = () => {
    setShowSearchDialog(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openScanDialog = () => {
    setShowScanDialog(true);
    // Auto-start camera when dialog opens
    setTimeout(() => startCamera(), 300);
  };

  const closeScanDialog = () => {
    stopCamera();
    setShowScanDialog(false);
  };

  const startCamera = async () => {
    if (isCameraActive) {
      console.log("[SCANNER] Camera already active");
      return;
    }

    console.log("[SCANNER] Starting camera...");
    try {
      if (!html5QrCodeRef.current) {
        console.log("[SCANNER] Initializing Html5Qrcode");
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-standalone");
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };
      
      console.log("[SCANNER] Config:", config);

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          console.log("[SCANNER] QR Code detected:", decodedText);
          
          setScanSuccess(true);
          
          await stopCamera();
          
          setTimeout(async () => {
            setScanSuccess(false);
            await handleCheckIn(decodedText);
          }, 1500);
        },
        (errorMessage) => {
          // Verbose error logging during scan attempts
          if (errorMessage && !errorMessage.includes("NotFoundException")) {
            console.log("[SCANNER] Scan error:", errorMessage);
          }
        }
      );

      setIsCameraActive(true);
      console.log("[SCANNER] Camera started successfully");
    } catch (err: any) {
      console.error('[SCANNER] Error starting camera:', err);
      alert('Failed to start camera. Please check camera permissions and try again.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = await html5QrCodeRef.current.getState();
        if (state === 2) { // SCANNING state
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
      setIsCameraActive(false);
    }
  };

  const handleCheckIn = async (participantId: string) => {
    // CRITICAL SECURITY CHECK: Must have agenda loaded
    if (!agenda) {
      console.error('[SECURITY] Cannot check in - agenda not loaded');
      return;
    }
    
    // CRITICAL SECURITY CHECK: Agenda must have eventId
    if (!agenda.eventId) {
      console.error('[SECURITY] CRITICAL: Cannot check in - agenda missing eventId!');
      alert('Security error: Invalid event configuration');
      return;
    }
    
    setIsRecording(true);
    try {
      // Clean up the participant ID (trim whitespace)
      const cleanId = participantId.trim();
      console.log('[SECURITY] Attempting check-in for participant:', cleanId);
      console.log('[SECURITY] Event context:', {
        eventId: agenda.eventId,
        agendaTitle: agenda.title,
        agendaId: agenda.id
      });
      
      // First check if participant exists
      const participant = localDB.getParticipantById(cleanId);
      console.log('[SECURITY] Found participant:', participant);
      
      if (!participant) {
        console.error('[SECURITY] Participant not found. Searched for ID:', cleanId);
        console.log('[SECURITY] Available participant IDs in this event:', participants.map(p => p.id));
        throw new Error(`Participant not found with ID: ${cleanId}`);
      }

      // CRITICAL SECURITY CHECK: Verify participant belongs to this event
      if (participant.eventId !== agenda.eventId) {
        console.error('[SECURITY] CRITICAL: Attempted cross-event check-in!', {
          participantEventId: participant.eventId,
          agendaEventId: agenda.eventId,
          participantId: cleanId,
          participantName: participant.name
        });
        throw new Error('Security violation: Participant does not belong to this event');
      }
      
      console.log('[SECURITY] Security check passed - participant belongs to event:', agenda.eventId);

      // Check if already checked in for this agenda
      const alreadyCheckedIn = participant.attendance?.some(
        a => a.agendaItem === agenda.title
      );
      
      if (alreadyCheckedIn) {
        // Show warning but don't fail
        setSuccessMessage(`${participant.name} is already checked in!`);
        setShowSuccessDialog(true);
      } else {
        // Record attendance
        console.log('[SECURITY] Recording attendance for participant in event:', agenda.eventId);
        localDB.recordAttendance(cleanId, agenda.title);
        
        // Show success message
        setSuccessMessage(`✓ Check-in successful for ${participant.name}`);
        setShowSuccessDialog(true);
        
        // Auto-print badge if enabled
        if (autoPrintBadge) {
          setTimeout(() => {
            printBadge(participant);
          }, 500);
        }
      }
      
      // Refresh participants list
      await fetchParticipants();
      
      // Close dialogs after a short delay
      setTimeout(() => {
        setShowScanDialog(false);
        setShowSearchDialog(false);
      }, 1500);
      
    } catch (err: any) {
      console.error('[LOCAL] Error recording attendance:', err);
      alert(err.message || 'Failed to record attendance. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  const formatDateTime = (datetime: string) => {
    if (!datetime) return '';
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (datetime: string) => {
    if (!datetime) return '';
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading check-in page...</p>
        </div>
      </div>
    );
  }

  if (error || !agenda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-red-600 flex items-center justify-center p-6">
        <div className="text-center text-white max-w-md">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl mb-2">Security Error</h2>
          <p className="text-lg opacity-90 mb-4">{error || 'Agenda not found'}</p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-sm">
            <p className="opacity-90">
              This check-in page requires proper event association. 
              The session may have been deleted or is missing required configuration.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Additional security check after agenda loads
  if (agenda && !agenda.eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center p-6">
        <div className="text-center text-white max-w-md">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl mb-2">Configuration Error</h2>
          <p className="text-lg opacity-90 mb-4">This session is not associated with any event</p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-sm">
            <p className="opacity-90">
              Please contact the event administrator. This session needs to be properly configured with an event association before check-ins can be performed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-6">
      {/* Event Security Badge */}
      {event && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white border border-white/30">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="opacity-90">Event:</span>
              <span className="font-semibold">{event.name}</span>
              <span className="mx-2 opacity-50">•</span>
              <span className="text-xs opacity-75">ID: {event.id}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Session Info */}
      <div className="max-w-2xl mx-auto text-center text-white mb-12">
        <h1 className="text-4xl mb-4">{agenda.title}</h1>
        <p className="text-lg opacity-90 mb-2">
          {formatDateTime(agenda.startTime)}
          {agenda.endTime && ` - ${formatTime(agenda.endTime)}`}
        </p>
        {agenda.location && (
          <p className="text-base opacity-80">{agenda.location}</p>
        )}
      </div>

      {/* Badge Settings */}
      <div className="max-w-md mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-white" />
              <Label htmlFor="auto-print" className="text-white text-sm">
                Auto-Print Badge on Check-In
              </Label>
            </div>
            <Switch
              id="auto-print"
              checked={autoPrintBadge}
              onCheckedChange={setAutoPrintBadge}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openBadgeDesigner}
            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
          >
            <Settings className="mr-2 h-4 w-4" />
            Design Badge Template
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-md mx-auto space-y-4">
        <Button
          onClick={openSearchDialog}
          className="w-full h-16 bg-gray-900 hover:bg-gray-800 text-white text-lg"
          size="lg"
        >
          <Search className="mr-3 h-6 w-6" />
          Search
        </Button>

        <Button
          onClick={openScanDialog}
          className="w-full h-16 bg-gray-900 hover:bg-gray-800 text-white text-lg"
          size="lg"
        >
          <QrCode className="mr-3 h-6 w-6" />
          QR Scan
        </Button>

        {/* Event Scope Info */}
        <div className="text-white text-center text-sm mt-6 space-y-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
              <div className="opacity-75 text-xs">Secure Event Scope Active</div>
            </div>
            <div className="font-semibold">{event?.name || 'Loading...'}</div>
            <div className="opacity-75 mt-2">
              Total Registered: {participants.length} participants
            </div>
            {agenda?.eventId && (
              <div className="text-xs opacity-50 mt-2 font-mono">
                Event ID: {agenda.eventId.substring(0, 8)}...
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={() => setShowDashboardDialog(true)}
          variant="outline"
          className="w-full h-16 bg-white/10 hover:bg-white/20 text-white border-white/30 text-lg backdrop-blur-sm"
          size="lg"
        >
          <BarChart3 className="mr-3 h-6 w-6" />
          View Dashboard
        </Button>
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto mt-16 text-center text-white/70 text-sm space-y-2">
        <p>✓ {checkedInParticipants.length} participants checked in</p>
        <p className="flex items-center justify-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          Auto-updating • Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Search Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg">
              {searchResults.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((participant) => {
                      const isCheckedIn = participant.attendance?.some(
                        a => a.agendaItem === agenda.title
                      );
                      return (
                        <TableRow key={participant.id}>
                          <TableCell>
                            <div>
                              <div>{participant.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{participant.company || '-'}</TableCell>
                          <TableCell>
                            {isCheckedIn ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                Checked In
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Not Checked In</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isCheckedIn && (
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(participant.id)}
                                disabled={isRecording}
                              >
                                {isRecording ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Check In'
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? (
                    <div>
                      <p className="mb-2">No participants found matching "{searchQuery}"</p>
                      <p className="text-sm">Total participants: {participants.length}</p>
                    </div>
                  ) : (
                    <p>Start typing to search participants</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scan Dialog */}
      <Dialog open={showScanDialog} onOpenChange={(open) => !open && closeScanDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <div 
                id="qr-reader-standalone" 
                className={`${isCameraActive ? 'block' : 'hidden'} rounded-lg overflow-hidden border-2 border-primary relative z-20`}
                style={{ minHeight: '300px' }}
              />
              
              {/* Success Overlay */}
              {scanSuccess && (
                <div className="absolute inset-0 bg-green-500/90 rounded-lg flex items-center justify-center z-50 animate-in fade-in">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
                      <CheckCircle2 className="w-16 h-16 text-green-500" />
                    </div>
                    <p className="text-white text-xl">QR Code Detected!</p>
                  </div>
                </div>
              )}

              {/* Camera Guide Overlay */}
              {isCameraActive && !scanSuccess && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                    <div className="relative w-full h-full">
                      {/* Corner borders */}
                      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white bg-black/50 inline-block px-4 py-2 rounded-lg text-sm">
                      Position QR code within the frame
                    </p>
                  </div>
                </div>
              )}

              {!isCameraActive && !scanSuccess && (
                <div className="h-64 flex flex-col items-center justify-center bg-muted rounded-lg gap-3 p-4">
                  <Camera className="h-12 w-12 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground text-sm">Camera will start automatically</p>
                  <Button 
                    onClick={startCamera}
                    variant="default"
                    size="sm"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera Manually
                  </Button>
                </div>
              )}
            </div>

            <Button 
              onClick={closeScanDialog} 
              variant="outline"
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dashboard Dialog */}
      <Dialog open={showDashboardDialog} onOpenChange={setShowDashboardDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Check-In Dashboard - {agenda.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {/* Event Security Badge */}
            {event && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="text-blue-700">Event:</span>
                  <span className="font-semibold text-blue-900">{event.name}</span>
                  <span className="mx-2 text-blue-400">•</span>
                  <span className="text-xs text-blue-600">Isolated Data View</span>
                </div>
              </div>
            )}
            
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-3xl mb-1">{checkedInParticipants.length}</div>
                  <div className="text-sm text-muted-foreground">Checked In</div>
                </div>
                <div>
                  <div className="text-3xl mb-1">{participants.length}</div>
                  <div className="text-sm text-muted-foreground">Total Registered (This Event)</div>
                </div>
              </div>
            </div>

            {checkedInParticipants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No participants checked in yet</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Check-In Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkedInParticipants.map((participant) => {
                      const attendance = participant.attendance.find(
                        a => a.agendaItem === agenda.title
                      );
                      return (
                        <TableRow key={participant.id}>
                          <TableCell>{participant.name}</TableCell>
                          <TableCell className="text-sm">{participant.email}</TableCell>
                          <TableCell>{participant.company || '-'}</TableCell>
                          <TableCell>{participant.position || '-'}</TableCell>
                          <TableCell>
                            {attendance && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(attendance.timestamp).toLocaleTimeString()}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl mb-2">Check-In Successful!</h3>
            <p className="text-lg text-muted-foreground">{successMessage}</p>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="mt-6"
              size="lg"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
      #qr-reader-standalone video, 
      #qr-reader-standalone canvas {
        width: 100% !important;
        height: auto !important;
        object-fit: cover; /* This makes the video cover the box nicely */
        min-height: 300px; /* Match your container's min-height */
      }
    `}</style>
    </div>
  );
}
