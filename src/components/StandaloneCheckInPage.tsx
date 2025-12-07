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
import { Search, QrCode, BarChart3, Loader2, CheckCircle2, X, Camera, Clock, AlertCircle, Printer, FileText, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Html5Qrcode } from 'html5-qrcode';
import QRCodeLib from 'qrcode';
import { supabase } from '../utils/supabase/client';
import type { AgendaItem, Participant, Event } from '../utils/localDBStub';
import { loadBadgeTemplates, type BadgeTemplate } from './BadgeTemplateSelector';

interface StandaloneCheckInPageProps {
  agendaId: string;
}

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
  const [successType, setSuccessType] = useState<'checkin' | 'undo' | 'warning'>('checkin');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoPrintBadge, setAutoPrintBadge] = useState(false);
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [availableTemplates, setAvailableTemplates] = useState<BadgeTemplate[]>([]);
  const [selectedBadgeTemplate, setSelectedBadgeTemplate] = useState<BadgeTemplate | null>(null);
  const [scannedParticipant, setScannedParticipant] = useState<Participant | null>(null);
  const [showParticipantCard, setShowParticipantCard] = useState(false);
  const [showBigSuccess, setShowBigSuccess] = useState(false);
  const [wasAlreadyCheckedIn, setWasAlreadyCheckedIn] = useState(false); // Track if participant was already checked in BEFORE this scan
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment'); // 'environment' = back camera, 'user' = front camera
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
    const handleParticipantsUpdated = (_e: any) => {
      console.log('[AUTO-REFRESH] Custom participantsUpdated event detected');
      if (agenda?.eventId) {
        console.log('[SECURITY] Custom event refresh scoped to event:', agenda.eventId);
      }
      fetchParticipants();
    };

    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    // @ts-ignore - Custom event
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
      // @ts-ignore
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

  // Sync searchResults when participants change (for real-time button updates)
  useEffect(() => {
    if (searchQuery && participants.length > 0) {
      const lowerQuery = searchQuery.toLowerCase();
      const results = participants.filter(p =>
        p.name?.toLowerCase().includes(lowerQuery) ||
        p.email?.toLowerCase().includes(lowerQuery) ||
        p.company?.toLowerCase().includes(lowerQuery)
      );
      setSearchResults(results);
    }
  }, [participants]);

  const fetchAgenda = async () => {
    setIsLoading(true);
    try {
      console.log('[SECURITY] Fetching agenda item by ID:', agendaId);
      
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('id', agendaId)
        .single();
      
      if (error || !data) {
        console.error('[SECURITY] Agenda item not found:', agendaId);
        setError('Agenda item not found');
        return;
      }
      
      // CRITICAL SECURITY CHECK: Ensure agenda has eventId
      if (!data.eventId) {
        console.error('[SECURITY] CRITICAL: Agenda item missing eventId!', data);
        setError('Invalid agenda configuration - missing event association');
        return;
      }
      
      console.log('[SECURITY] Agenda item loaded. Event ID:', data.eventId);
      
      // Convert snake_case to camelCase if needed
      const foundAgenda: AgendaItem = {
        id: data.id,
        eventId: data.eventId,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        createdAt: data.createdAt,
        order: 0
      };
      
      setAgenda(foundAgenda);
      
      // Load the associated event details for display
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', foundAgenda.eventId)
        .single();
      
      if (eventData && !eventError) {
        console.log('[SECURITY] Event details loaded:', eventData.name);
        const associatedEvent: Event = {
          id: eventData.id,
          name: eventData.name,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          location: eventData.location,
          description: eventData.description,
          createdAt: eventData.createdAt,
          customFields: eventData.customFields || [],
          branding: eventData.branding
        };
        setEvent(associatedEvent);
        
        // Load badge templates for this event
        const templates = await loadBadgeTemplates(eventData.id);
        setAvailableTemplates(templates);
        
        // Auto-select default template
        const defaultTemplate = templates.find(t => t.is_default);
        if (defaultTemplate) {
          setSelectedBadgeTemplate(defaultTemplate);
        } else if (templates.length > 0) {
          setSelectedBadgeTemplate(templates[0]);
        }
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
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('eventId', agenda.eventId);
      
      if (error) {
        throw new Error(`Failed to fetch participants: ${error.message}`);
      }
      
      const eventParticipants = (data || []) as any[];
      
      console.log('[SECURITY] Successfully filtered participants by eventId:', {
        eventId: agenda.eventId,
        participantCount: eventParticipants.length,
        agendaTitle: agenda.title
      });
      
      // Verify all participants belong to this event
      const invalidParticipants = eventParticipants.filter((p: any) => p.eventId !== agenda.eventId);
      if (invalidParticipants.length > 0) {
        console.error('[SECURITY] CRITICAL: Found participants from other events!', invalidParticipants);
      } else {
        console.log('[SECURITY] ✓ All participants verified to belong to event:', agenda.eventId);
      }
      
      setParticipants(eventParticipants);
      setLastUpdated(new Date());
      
      // Update checked-in participants for this specific session
      const checkedIn = eventParticipants.filter((p: any) => 
        p.attendance && p.attendance.some((a: any) => a.agendaItem === agenda.title)
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
      
      // Update scanned participant if exists (to sync check-in status)
      if (scannedParticipant) {
        const updated = eventParticipants.find((p: any) => p.id === scannedParticipant.id);
        if (updated) setScannedParticipant(updated);
      }
      
    } catch (err: any) {
      console.error('[SECURITY] Error fetching participants:', err);
      setError('Failed to load participants');
    }
  };

  const printBadge = async (participant: Participant) => {
    if (!event || !agenda) return;
    
    try {
      // Try to load badge template from Supabase (new system)
      let canvasLayout: any = null;
      let badgeSettings: any = {
        size: 'CR80',
        customWidth: 100,
        customHeight: 150,
        backgroundColor: '#ffffff',
        backgroundImageUrl: undefined,
        backgroundImageFit: 'cover',
        logoUrl: undefined
      };

      // Priority 1: Use selected badge template from dropdown (badge_templates table)
      if (selectedBadgeTemplate && selectedBadgeTemplate.template_data) {
        const templateData = selectedBadgeTemplate.template_data;
        badgeSettings = {
          size: templateData.size || 'CR80',
          customWidth: templateData.customWidth,
          customHeight: templateData.customHeight,
          backgroundColor: templateData.backgroundColor || '#ffffff',
          backgroundImageUrl: templateData.backgroundImageUrl,
          backgroundImageFit: templateData.backgroundImageFit || 'cover',
          logoUrl: templateData.logoUrl
        };
        canvasLayout = templateData.components;
      }
      // Priority 2: Check if event has badge_template in Supabase (legacy)
      else if ((event as any).badge_template) {
        const template = (event as any).badge_template;
        badgeSettings = {
          size: template.size || 'CR80',
          customWidth: template.customWidth,
          customHeight: template.customHeight,
          backgroundColor: template.backgroundColor || '#ffffff',
          backgroundImageUrl: template.backgroundImageUrl,
          backgroundImageFit: template.backgroundImageFit || 'cover',
          logoUrl: template.logoUrl
        };
        canvasLayout = template.components;
      } else {
        // Fallback to localStorage
        const canvasLayoutStr = localStorage.getItem(`badge_canvas_${event.id}`);
        canvasLayout = canvasLayoutStr ? JSON.parse(canvasLayoutStr) : null;
      }
      
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
      
      // Get badge dimensions - includes Indonesian ID card holder sizes
      const BADGE_SIZES: any = {
        CR80: { width: 85.6, height: 53.98 },
        // Indonesian ID Card Holder Sizes (B Series - Landscape)
        B1: { width: 85, height: 55 },
        B2: { width: 105, height: 65 },
        B3: { width: 105, height: 80 },
        B4: { width: 130, height: 90 },
        // Indonesian ID Card Holder Sizes (A Series - Portrait)
        A1: { width: 55, height: 90 },
        A2: { width: 65, height: 95 },
        A3: { width: 80, height: 100 },
        // Paper sizes
        A6: { width: 105, height: 148 },
        A7: { width: 74, height: 105 },
        custom: { width: badgeSettings.customWidth || 100, height: badgeSettings.customHeight || 150 }
      };
      
      // @ts-ignore - BadgeSettings properties from legacy schema
      const selectedSize = BADGE_SIZES[badgeSettings.size || 'CR80'] || BADGE_SIZES.CR80;
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
            overflow: hidden;
          }
          @media screen {
            .badge {
              border: 1px solid #ddd;
            }
          }
          .badge-component {
            position: absolute;
            overflow: hidden;
          }
        `;
        
        canvasLayout
          .filter((c: any) => c.enabled)
          .forEach((component: any) => {
            // Map text-align to justify-content for flexbox
            const textAlign = component.textAlign || 'left';
            const justifyContent = textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start';
            
            const componentStyle = `
              left: ${component.x}%;
              top: ${component.y}%;
              width: ${component.width}%;
              height: ${component.height}%;
              font-size: ${component.fontSize || 16}px;
              font-family: ${component.fontFamily || 'sans-serif'};
              font-weight: ${component.fontWeight || 'normal'};
              font-style: ${component.fontStyle || 'normal'};
              color: ${component.color || '#000000'};
              display: flex;
              align-items: center;
              justify-content: ${justifyContent};
            `;
            
            if (component.type === 'eventName') {
              badgeContent += `<div class="badge-component" style="${componentStyle}">${event.name}</div>`;
            } else if (component.type === 'field' && component.fieldName) {
              // Get field value - check standard fields first, then customData
              const standardFields = ['name', 'email', 'phone', 'company', 'position'];
              const fieldName = component.fieldName;
              let value: string | undefined;
              
              if (standardFields.includes(fieldName)) {
                value = (participant as any)[fieldName];
              } else {
                // Custom field - check in customData
                value = participant.customData?.[fieldName];
              }
              
              // Only show the value, not the label
              badgeContent += `
                <div class="badge-component" style="${componentStyle}">
                  <span>${value || '-'}</span>
                </div>
              `;
            } else if (component.type === 'qrcode') {
              badgeContent += `
                <div class="badge-component" style="${componentStyle}">
                  <img src="${qrCodeUrl}" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>
              `;
            } else if (component.type === 'logo') {
              const logoUrl = badgeSettings.logoUrl || event.branding?.logoUrl;
              if (logoUrl) {
                badgeContent += `
                  <div class="badge-component" style="${componentStyle}">
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
            align-items: ${(badgeSettings as any).alignment === 'left' ? 'flex-start' : (badgeSettings as any).alignment === 'right' ? 'flex-end' : 'center'};
            text-align: ${(badgeSettings as any).alignment || 'center'};
          }
          @media screen {
            .badge {
              border: 1px solid #ddd;
            }
          }
        `;
        
        // @ts-ignore - components from legacy schema
        (badgeSettings.components || [])
          // @ts-ignore
          .filter((c: any) => c.enabled)
          // @ts-ignore
          .sort((a: any, b: any) => a.order - b.order)
          // @ts-ignore
          .forEach((component: any) => {
            if (component.type === 'eventName') {
              // @ts-ignore - fontSize from legacy schema
              badgeContent += `<div style="font-size: ${fontSizes[(badgeSettings as any).fontSize || 'medium'].title}; font-weight: bold; margin: 8px 0;">${event.name}</div>`;
            } else if (component.type === 'field' && component.fieldName) {
              // Get field value - check standard fields first, then customData
              const standardFields = ['name', 'email', 'phone', 'company', 'position'];
              const fieldName = component.fieldName;
              let value: string | undefined;
              
              if (standardFields.includes(fieldName)) {
                value = (participant as any)[fieldName];
              } else {
                // Custom field - check in customData
                value = participant.customData?.[fieldName];
              }
              // @ts-ignore
              badgeContent += `
                <div style="margin: 8px 0;">
                  <div style="font-size: ${fontSizes[(badgeSettings as any).fontSize || 'medium'].text}; opacity: 0.7;">${component.label}</div>
                  <div style="font-size: ${fontSizes[(badgeSettings as any).fontSize || 'medium'].text};">${value || '-'}</div>
                </div>
              `;
            } else if (component.type === 'qrcode') {
              // @ts-ignore
              badgeContent += `<img src="${qrCodeUrl}" style="width: ${qrSizes[(badgeSettings as any).qrCodeSize || 'medium']}; height: ${qrSizes[(badgeSettings as any).qrCodeSize || 'medium']}; margin: 8px 0;" />`;
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
              @page {
                size: ${width}mm ${height}mm;
                margin: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                width: ${width}mm;
                height: ${height}mm;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: Arial, sans-serif;
              }
              @media print {
                html, body {
                  width: ${width}mm;
                  height: ${height}mm;
                }
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
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
        { facingMode: cameraFacing },
        config,
        async (decodedText) => {
          console.log("[SCANNER] QR Code detected:", decodedText);
          
          setScanSuccess(true);
          await stopCamera();
          
          // Find participant first
          const cleanId = decodedText.trim();
          const foundParticipant = participants.find(p => p.id === cleanId);
          
          if (foundParticipant) {
            // Check if already checked in BEFORE setting state
            const isAlreadyCheckedIn = foundParticipant.attendance?.some(
              (a: any) => a.agendaItem === agenda?.title
            );
            
            setScannedParticipant(foundParticipant);
            setWasAlreadyCheckedIn(isAlreadyCheckedIn);
            
            if (autoCheckIn) {
              // Auto check-in mode
              if (isAlreadyCheckedIn) {
                // Already checked in - just show participant card with warning
                setTimeout(() => {
                  setScanSuccess(false);
                  setShowScanDialog(false);
                  setShowParticipantCard(true);
                }, 500);
              } else {
                // Not checked in yet - proceed with check-in
                setTimeout(async () => {
                  setScanSuccess(false);
                  await handleCheckIn(decodedText);
                }, 500);
              }
            } else {
              // Manual mode: show participant card for confirmation
              setTimeout(() => {
                setScanSuccess(false);
                setShowScanDialog(false);
                setShowParticipantCard(true);
              }, 1000);
            }
          } else {
            // Participant not found
            setTimeout(async () => {
              setScanSuccess(false);
              await handleCheckIn(decodedText); // This will show error
            }, 500);
          }
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
      
      // First check if participant exists in Supabase
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', cleanId)
        .eq('eventId', agenda.eventId)
        .single();
      
      if (participantError || !participantData) {
        console.error('[SECURITY] Participant not found. Searched for ID:', cleanId);
        console.log('[SECURITY] Available participant IDs in this event:', participants.map(p => p.id));
        throw new Error(`Participant not found with ID: ${cleanId}`);
      }

      const participant = participantData;
      console.log('[SECURITY] Found participant:', participant);

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
        (a: any) => a.agendaItem === agenda.title
      );
      
      if (alreadyCheckedIn) {
        // Already checked in - show participant card with warning indicator
        setWasAlreadyCheckedIn(true); // Mark that this was already checked in
        setScannedParticipant(participant);
        setShowScanDialog(false);
        setShowParticipantCard(true);
        // Don't show big success for already checked in
        setShowBigSuccess(false);
      } else {
        // Record attendance in Supabase
        const updatedAttendance = [...(participant.attendance || []), {
          agendaItem: agenda.title,
          timestamp: new Date().toISOString()
        }];
        
        console.log('[SECURITY] Recording attendance for participant in event:', agenda.eventId);
        
        const { error: updateError } = await supabase
          .from('participants')
          .update({ attendance: updatedAttendance })
          .eq('id', cleanId);
        
        if (updateError) {
          throw new Error(`Failed to record attendance: ${updateError.message}`);
        }
        
        // Update scanned participant reference
        setScannedParticipant({ ...participant, attendance: updatedAttendance });
        
        // Show big success animation (like Eventnook)
        setWasAlreadyCheckedIn(false); // This is a fresh check-in
        setShowBigSuccess(true);
        setShowScanDialog(false);
        setShowParticipantCard(true);
        
        // Auto-print badge if enabled
        if (autoPrintBadge) {
          setTimeout(() => {
            printBadge(participant);
          }, 500);
        }
        
        // Hide big success after 2 seconds
        setTimeout(() => {
          setShowBigSuccess(false);
        }, 2000);
      }
      
      // Refresh participants list
      await fetchParticipants();
      
    } catch (err: any) {
      console.error('[LOCAL] Error recording attendance:', err);
      alert(err.message || 'Failed to record attendance. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleUndoCheckIn = async (participantId: string) => {
    if (!agenda) {
      console.error('[SECURITY] Cannot undo check-in - agenda not loaded');
      return;
    }
    
    if (!agenda.eventId) {
      console.error('[SECURITY] Cannot undo check-in - agenda missing eventId');
      return;
    }

    setIsRecording(true);
    try {
      const cleanId = participantId.trim();
      console.log('[UNDO] Attempting to undo check-in for participant:', cleanId);
      
      // Fetch participant from Supabase
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', cleanId)
        .eq('eventId', agenda.eventId)
        .single();
      
      if (participantError || !participantData) {
        throw new Error(`Participant not found with ID: ${cleanId}`);
      }

      const participant = participantData;
      
      // Remove attendance record for this agenda
      const updatedAttendance = (participant.attendance || []).filter(
        (a: any) => a.agendaItem !== agenda.title
      );
      
      console.log('[UNDO] Removing attendance for session:', agenda.title);
      
      const { error: updateError } = await supabase
        .from('participants')
        .update({ attendance: updatedAttendance })
        .eq('id', cleanId);
      
      if (updateError) {
        throw new Error(`Failed to undo check-in: ${updateError.message}`);
      }
      
      // Show success message
      setSuccessMessage(`Check-in removed for ${participant.name}`);
      setSuccessType('undo');
      setShowSuccessDialog(true);
      
      // Refresh participants list (useEffect will auto-sync searchResults)
      await fetchParticipants();
      
    } catch (err: any) {
      console.error('[UNDO] Error undoing check-in:', err);
      alert(err.message || 'Failed to undo check-in. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-6 relative">
      {/* Settings Button - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Check-in Settings</h4>
              
              {/* Auto Check-in Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${autoCheckIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <Label htmlFor="auto-checkin-popover" className="text-sm">
                      Auto Check-in
                    </Label>
                  </div>
                  <Switch
                    id="auto-checkin-popover"
                    checked={autoCheckIn}
                    onCheckedChange={setAutoCheckIn}
                  />
                </div>
                <p className="text-xs text-muted-foreground pl-4">
                  {autoCheckIn 
                    ? 'Check in immediately when QR is scanned' 
                    : 'Show participant info first'}
                </p>
              </div>
              
              <div className="border-t pt-3" />
              
              {/* Auto Print Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="auto-print-popover" className="text-sm">
                    Auto-Print Badge
                  </Label>
                </div>
                <Switch
                  id="auto-print-popover"
                  checked={autoPrintBadge}
                  onCheckedChange={setAutoPrintBadge}
                />
              </div>
              
              <div className="border-t pt-3" />
              
              {/* Badge Template Selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Badge Template</Label>
                </div>
                {availableTemplates.length > 0 ? (
                  <Select
                    value={selectedBadgeTemplate?.id || ''}
                    onValueChange={(value) => {
                      const template = availableTemplates.find(t => t.id === value);
                      setSelectedBadgeTemplate(template || null);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            <span>{template.name}</span>
                            {template.is_default && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No templates found. Create one in Badge Designer.
                  </p>
                )}
              </div>
              
              <div className="border-t pt-3" />
              
              {/* Camera Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Scanner Camera</Label>
                </div>
                <Select
                  value={cameraFacing}
                  onValueChange={(value: 'environment' | 'user') => setCameraFacing(value)}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="environment" className="text-sm">
                      Back Camera (Default)
                    </SelectItem>
                    <SelectItem value="user" className="text-sm">
                      Front Camera
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Change will apply on next scan
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Event Security Badge */}
      {event && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white border border-white/30">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="status-dot status-dot-success status-dot-pulse"></span>
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

      {/* Action Buttons */}
      <div className="max-w-md mx-auto space-y-4">
        <Button
          onClick={openSearchDialog}
          className="w-full h-16 bg-neutral-900 hover:bg-neutral-800 text-white text-lg"
          size="lg"
        >
          <Search className="mr-3 h-6 w-6" />
          Search
        </Button>

        <Button
          onClick={openScanDialog}
          className="w-full h-16 bg-neutral-900 hover:bg-neutral-800 text-white text-lg"
          size="lg"
        >
          <QrCode className="mr-3 h-6 w-6" />
          QR Scan
        </Button>

        {/* Event Scope Info */}
        <div className="text-white text-center text-sm mt-6 space-y-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="status-dot status-dot-success"></span>
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
        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col w-[95vw]">
          <DialogHeader>
            <DialogTitle>Search Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />

            <div className="flex-1 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((participant) => {
                    const isCheckedIn = participant.attendance?.some(
                      a => a.agendaItem === agenda?.title
                    );
                    return (
                      <div 
                        key={participant.id}
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{participant.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{participant.email}</div>
                            {participant.company && (
                              <div className="text-xs text-muted-foreground truncate">{participant.company}</div>
                            )}
                          </div>
                          <div>
                            {isCheckedIn ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUndoCheckIn(participant.id)}
                                disabled={isRecording}
                                style={{ color: '#ea580c', borderColor: '#fdba74', minWidth: '80px' }}
                              >
                                {isRecording ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Undo'
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(participant.id)}
                                disabled={isRecording}
                                style={{ backgroundColor: '#16a34a', color: 'white', minWidth: '80px' }}
                              >
                                {isRecording ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Check In'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
      <Dialog open={showScanDialog} onOpenChange={(open: boolean) => !open && closeScanDialog()}>
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
                <div className="absolute inset-0 bg-success/90 rounded-lg flex items-center justify-center z-50 animate-in fade-in">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
                      <CheckCircle2 className="w-16 h-16 text-success" />
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
        <DialogContent className="w-[80vw] max-w-[80vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Check-In Dashboard - {agenda.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {/* Event Security Badge */}
            {event && (
              <div className="mb-4 p-3 bg-info-light border-info-light rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                  <span className="status-dot status-dot-info status-dot-pulse"></span>
                  <span className="text-info-dark">Event:</span>
                  <span className="font-semibold text-primary-900">{event.name}</span>
                  <span className="mx-2 text-primary-400">•</span>
                  <span className="text-xs text-info">Isolated Data View</span>
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
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[200px]">Email</TableHead>
                        <TableHead className="min-w-[180px]">Company</TableHead>
                        <TableHead className="min-w-[120px]">Position</TableHead>
                        <TableHead className="min-w-[120px]">Check-In Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkedInParticipants.map((participant) => {
                        const attendance = participant.attendance.find(
                          a => a.agendaItem === agenda.title
                        );
                        return (
                          <TableRow key={participant.id}>
                            <TableCell className="font-medium">{participant.name}</TableCell>
                            <TableCell className="text-sm break-all">{participant.email}</TableCell>
                            <TableCell>{participant.company || '-'}</TableCell>
                            <TableCell>{participant.position || '-'}</TableCell>
                            <TableCell>
                              {attendance && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
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
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500 ${
              successType === 'undo' ? 'bg-orange-100' : successType === 'warning' ? 'bg-yellow-100' : 'bg-success-light'
            }`}>
              {successType === 'undo' ? (
                <X className="w-12 h-12 text-orange-600" />
              ) : successType === 'warning' ? (
                <AlertCircle className="w-12 h-12 text-yellow-600" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-success" />
              )}
            </div>
            <h3 className="text-2xl mb-2">
              {successType === 'undo' ? 'Check-In Undone' : successType === 'warning' ? 'Already Checked In' : 'Check-In Successful!'}
            </h3>
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

      {/* Big Success Animation Overlay (like Eventnook) */}
      {showBigSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-500">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-20 h-20 text-green-500" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      )}

      {/* Participant Card Dialog (after scan) */}
      <Dialog open={showParticipantCard} onOpenChange={(open) => {
        setShowParticipantCard(open);
        if (!open) {
          setScannedParticipant(null);
          setShowBigSuccess(false);
          setWasAlreadyCheckedIn(false);
        }
      }}>
        <DialogContent className="max-w-md">
          {scannedParticipant && (
            <div className="space-y-4">
              {/* Status Icon and Message */}
              {(() => {
                // Use wasAlreadyCheckedIn state instead of checking current attendance
                // This prevents icon from changing after fetchParticipants updates the data
                if (wasAlreadyCheckedIn) {
                  // Was already checked in BEFORE this scan - show info (blue)
                  return (
                    <div className="flex flex-col items-center -mt-2 mb-2">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-16 h-16 text-blue-500" strokeWidth={2.5} />
                      </div>
                      <p className="text-blue-600 font-medium mt-2 text-lg">Already Checked In</p>
                    </div>
                  );
                } else if (scannedParticipant.attendance?.some(a => a.agendaItem === agenda?.title)) {
                  // Fresh check-in success - show green checkmark
                  return (
                    <div className="flex flex-col items-center -mt-2 mb-2">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={2.5} />
                      </div>
                      <p className="text-green-600 font-medium mt-2 text-lg">Check-in Successful!</p>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Scan Next Button */}
              <Button
                onClick={() => {
                  setShowParticipantCard(false);
                  setScannedParticipant(null);
                  setShowBigSuccess(false);
                  setWasAlreadyCheckedIn(false);
                  setTimeout(() => openScanDialog(), 100);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Scan Next
              </Button>

              {/* Participant Info Card */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900">{scannedParticipant.name}</h3>
                  <p className="text-sm text-gray-500">{scannedParticipant.email}</p>
                  {scannedParticipant.company && (
                    <p className="text-sm text-gray-500">{scannedParticipant.company}</p>
                  )}
                  {scannedParticipant.position && (
                    <p className="text-xs text-gray-400">{scannedParticipant.position}</p>
                  )}
                </div>

                {/* Tags/Status */}
                <div className="flex flex-wrap justify-center gap-2">
                  {scannedParticipant.attendance?.some(a => a.agendaItem === agenda?.title) && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      ✓ Checked In
                    </span>
                  )}
                  {scannedParticipant.customData?.category && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {scannedParticipant.customData.category}
                    </span>
                  )}
                  {scannedParticipant.customData?.vip && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                      VIP
                    </span>
                  )}
                </div>

                {/* Check-in Time */}
                {(() => {
                  const attendance = scannedParticipant.attendance?.find(a => a.agendaItem === agenda?.title);
                  if (attendance) {
                    return (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-2 border-t border-gray-200">
                        <Clock className="h-4 w-4" />
                        <span>Checked in at {new Date(attendance.timestamp).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                  onClick={() => printBadge(scannedParticipant)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                {scannedParticipant.attendance?.some(a => a.agendaItem === agenda?.title) ? (
                  <Button
                    variant="outline"
                    className="flex-1 bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    onClick={async () => {
                      await handleUndoCheckIn(scannedParticipant.id);
                      // Refresh scanned participant
                      const updated = participants.find(p => p.id === scannedParticipant.id);
                      if (updated) setScannedParticipant(updated);
                    }}
                    disabled={isRecording}
                  >
                    {isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Uncheck'}
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={async () => {
                      await handleCheckIn(scannedParticipant.id);
                    }}
                    disabled={isRecording}
                  >
                    {isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check In'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
      #qr-reader-standalone video, 
      #qr-reader-standalone canvas {
        width: 100% !important;
        height: auto !important;
        object-fit: cover;
        min-height: 300px;
        /* Remove mirror effect - important for QR scanning accuracy */
        transform: scaleX(1) !important;
        -webkit-transform: scaleX(1) !important;
      }
    `}</style>
    </div>
  );
}
