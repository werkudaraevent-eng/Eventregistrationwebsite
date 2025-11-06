import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { QrCode, Loader2, CheckCircle2, User, Building2, Briefcase, Phone, Mail, Clock, Printer, Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as localDB from '../utils/localStorage';

type Participant = localDB.Participant;
type AgendaItem = localDB.AgendaItem;

interface AttendanceScannerProps {
  eventId: string;
}

export function AttendanceScanner({ eventId }: AttendanceScannerProps) {
  const [qrCode, setQrCode] = useState('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [selectedAgenda, setSelectedAgenda] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [badgeSize, setBadgeSize] = useState('standard');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [displaySettings, setDisplaySettings] = useState({
    name: true,
    company: true,
    position: true,
  });
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchAgenda();
    
    return () => {
      stopCamera();
    };
  }, [eventId]);

  // Auto-refresh: Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      console.log('[SCANNER AUTO-REFRESH] Storage event detected:', e.key);
      if (e.key === 'event_agenda') {
        console.log('[SCANNER AUTO-REFRESH] Agenda data changed, refreshing...');
        fetchAgenda();
      }
    };

    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);

    // Polling mechanism for same-tab updates (every 5 seconds)
    const pollInterval = setInterval(() => {
      console.log('[SCANNER AUTO-REFRESH] Polling for agenda updates...');
      fetchAgenda();
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [eventId]);

  const fetchAgenda = async () => {
    try {
      console.log('[LOCAL] Fetching agenda from localStorage for event:', eventId);
      const agenda = localDB.getAllAgenda(eventId);
      setAgendaItems(agenda);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[LOCAL] Error fetching agenda:', err);
    }
  };

  const startCamera = async () => {
    if (isCameraActive) {
      stopCamera();
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // Success callback
          console.log("QR Code detected:", decodedText);
          
          // Show success animation
          setScanSuccess(true);
          
          // Stop camera
          await stopCamera();
          
          // Wait for animation
          setTimeout(async () => {
            setScanSuccess(false);
            setQrCode(decodedText);
            await handleScanAndRecord(decodedText);
          }, 1500);
        },
        (errorMessage) => {
          // Error callback - can be ignored for continuous scanning
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Error starting camera:', err);
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

  const handleScanAndRecord = async (code: string) => {
    if (!code.trim()) return;

    setIsScanning(true);
    try {
      // Fetch participant
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/make-server-04dd31ce/participant/${code.trim()}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Participant not found');
      }

      setParticipant(data.participant);

      // If agenda is selected, automatically record attendance
      if (selectedAgenda) {
        await recordAttendance(data.participant);
      }
    } catch (err: any) {
      console.error('Error scanning QR code:', err);
      alert(err.message || 'Failed to scan QR code. Please try again.');
      setParticipant(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleScan = async (code?: string) => {
    const codeToScan = code || qrCode;
    if (!codeToScan.trim()) return;

    setIsScanning(true);
    try {
      console.log('[LOCAL] Looking up participant:', codeToScan.trim());
      const participant = localDB.getParticipantById(codeToScan.trim());

      if (!participant) {
        throw new Error('Participant not found');
      }

      setParticipant(participant);
      setLastScanned(null);
    } catch (err: any) {
      console.error('[LOCAL] Error scanning QR code:', err);
      alert(err.message || 'Failed to scan QR code');
      setParticipant(null);
    } finally {
      setIsScanning(false);
    }
  };

  const recordAttendance = async (p: Participant) => {
    if (!selectedAgenda) {
      alert('Please select an agenda item');
      return;
    }

    setIsRecording(true);
    try {
      console.log('[LOCAL] Recording attendance for:', p.id, selectedAgenda);
      localDB.recordAttendance(p.id, selectedAgenda);
      
      // Get updated participant
      const updatedParticipant = localDB.getParticipantById(p.id);
      if (!updatedParticipant) {
        throw new Error('Failed to update participant');
      }

      setLastScanned(p.name);
      setParticipant(updatedParticipant);

      // Open display window for participant
      openParticipantDisplay(updatedParticipant);

      // Auto print badge if enabled
      if (autoPrint) {
        handlePrintBadge(updatedParticipant);
      }

      // Reset for next scan after a delay
      setTimeout(() => {
        setQrCode('');
        setParticipant(null);
        setLastScanned(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error recording attendance:', err);
      alert(err.message || 'Failed to record attendance');
    } finally {
      setIsRecording(false);
    }
  };

  const handleRecordAttendance = async () => {
    if (!participant) {
      alert('No participant scanned');
      return;
    }
    await recordAttendance(participant);
  };

  const openParticipantDisplay = (p: Participant) => {
    const displayWindow = window.open('', '_blank', 'width=800,height=600');
    if (!displayWindow) {
      alert('Please allow popups to show participant display');
      return;
    }

    const displayData = [];
    if (displaySettings.name) displayData.push({ label: 'Name', value: p.name });
    if (displaySettings.company && p.company) displayData.push({ label: 'Company', value: p.company });
    if (displaySettings.position && p.position) displayData.push({ label: 'Position', value: p.position });

    displayWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Welcome - ${p.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              color: white;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 600px;
              animation: fadeIn 0.5s ease-in;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .welcome {
              font-size: 48px;
              margin-bottom: 30px;
              font-weight: 300;
            }
            .checkmark {
              width: 100px;
              height: 100px;
              margin: 0 auto 30px;
              background: rgba(255,255,255,0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 60px;
              animation: scaleIn 0.5s ease-out;
            }
            @keyframes scaleIn {
              from { transform: scale(0); }
              to { transform: scale(1); }
            }
            .details {
              background: rgba(255,255,255,0.15);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              margin-top: 30px;
            }
            .detail-item {
              margin: 20px 0;
              font-size: 24px;
            }
            .detail-label {
              opacity: 0.8;
              font-size: 16px;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .detail-value {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1 class="welcome">Welcome!</h1>
            <div class="details">
              ${displayData.map(item => `
                <div class="detail-item">
                  <div class="detail-label">${item.label}</div>
                  <div class="detail-value">${item.value}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </body>
      </html>
    `);
    displayWindow.document.close();
  };

  const handlePrintBadge = (p?: Participant) => {
    const participantToPrint = p || participant;
    if (!participantToPrint) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const badgeWidth = badgeSize === 'small' ? '250px' : badgeSize === 'large' ? '400px' : '300px';
    const badgeHeight = badgeSize === 'small' ? '350px' : badgeSize === 'large' ? '550px' : '450px';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Badge - ${participantToPrint.name}</title>
          <style>
            @page {
              size: ${badgeWidth} ${badgeHeight};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .badge {
              width: ${badgeWidth};
              height: ${badgeHeight};
              border: 2px solid #333;
              border-radius: 12px;
              padding: 20px;
              box-sizing: border-box;
              text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .badge h1 {
              font-size: ${badgeSize === 'small' ? '18px' : badgeSize === 'large' ? '28px' : '24px'};
              margin: 10px 0;
            }
            .badge .company {
              font-size: ${badgeSize === 'small' ? '12px' : badgeSize === 'large' ? '18px' : '14px'};
              opacity: 0.9;
              margin-bottom: 10px;
            }
            .badge .position {
              font-size: ${badgeSize === 'small' ? '11px' : badgeSize === 'large' ? '16px' : '13px'};
              opacity: 0.8;
            }
            .badge .qr-code {
              margin: 20px auto;
              background: white;
              padding: 10px;
              border-radius: 8px;
              display: inline-block;
            }
            .badge .qr-code img {
              display: block;
            }
            .badge .id {
              font-size: ${badgeSize === 'small' ? '10px' : badgeSize === 'large' ? '14px' : '12px'};
              opacity: 0.7;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="badge">
            <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
              <div style="font-size: ${badgeSize === 'small' ? '14px' : badgeSize === 'large' ? '20px' : '16px'}; font-weight: bold;">EVENT BADGE</div>
            </div>
            <h1>${participantToPrint.name}</h1>
            ${participantToPrint.company ? `<div class="company">${participantToPrint.company}</div>` : ''}
            ${participantToPrint.position ? `<div class="position">${participantToPrint.position}</div>` : ''}
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${participantToPrint.id}" alt="QR Code" />
            </div>
            <div class="id">${participantToPrint.id}</div>
          </div>
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
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>
            Scan participant QR codes to track attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Scanner */}
          <div className="space-y-2">
            <Label>Camera Scanner</Label>
            <div className="relative">
              <div 
                id="qr-reader" 
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
                    <p className="text-white text-xl font-semibold">QR Code Detected!</p>
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
                      
                      {/* Scanning line animation */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute w-full h-1 bg-green-500 animate-scan-line" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white bg-black/50 inline-block px-4 py-2 rounded-lg">
                      Position QR code within the frame
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              onClick={startCamera} 
              variant={isCameraActive ? "destructive" : "default"}
              className="w-full"
              size="lg"
            >
              {isCameraActive ? (
                <>
                  <X className="mr-2 h-5 w-5" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera Scan
                </>
              )}
            </Button>
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <Label htmlFor="qr-code">Or Enter Participant ID Manually</Label>
            <div className="flex gap-2">
              <Input
                id="qr-code"
                placeholder="Enter participant ID"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <Button onClick={() => handleScan()} disabled={isScanning || !qrCode.trim()}>
                {isScanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Scan'
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">Select Session *</Label>
            <Select value={selectedAgenda} onValueChange={setSelectedAgenda}>
              <SelectTrigger id="agenda">
                <SelectValue placeholder="Choose agenda item" />
              </SelectTrigger>
              <SelectContent>
                {agendaItems.map((item) => (
                  <SelectItem key={item.id} value={item.title}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedAgenda && (
              <p className="text-sm text-amber-600">⚠️ Please select a session before scanning</p>
            )}
          </div>

          {/* Display Settings */}
          <div className="border-t pt-4 space-y-3">
            <Label>Display Settings (shown to participants)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="display-name"
                  checked={displaySettings.name}
                  onCheckedChange={(checked) => 
                    setDisplaySettings(prev => ({ ...prev, name: checked as boolean }))
                  }
                />
                <label htmlFor="display-name" className="text-sm cursor-pointer">
                  Show Name
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="display-company"
                  checked={displaySettings.company}
                  onCheckedChange={(checked) => 
                    setDisplaySettings(prev => ({ ...prev, company: checked as boolean }))
                  }
                />
                <label htmlFor="display-company" className="text-sm cursor-pointer">
                  Show Company
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="display-position"
                  checked={displaySettings.position}
                  onCheckedChange={(checked) => 
                    setDisplaySettings(prev => ({ ...prev, position: checked as boolean }))
                  }
                />
                <label htmlFor="display-position" className="text-sm cursor-pointer">
                  Show Position
                </label>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-print">Auto-print Badge</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically print after attendance recorded
                </p>
              </div>
              <Switch
                id="auto-print"
                checked={autoPrint}
                onCheckedChange={setAutoPrint}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-size">Badge Size</Label>
              <Select value={badgeSize} onValueChange={setBadgeSize}>
                <SelectTrigger id="badge-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (250x350px)</SelectItem>
                  <SelectItem value="standard">Standard (300x450px)</SelectItem>
                  <SelectItem value="large">Large (400x550px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {lastScanned && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded flex items-center gap-2 animate-in slide-in-from-top">
              <CheckCircle2 className="h-5 w-5" />
              <span>✅ Attendance recorded for {lastScanned}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participant Details</CardTitle>
          <CardDescription>
            Information will appear after scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participant ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{participant.email}</span>
                </div>
                {participant.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{participant.phone}</span>
                  </div>
                )}
                {participant.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{participant.company}</span>
                  </div>
                )}
                {participant.position && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{participant.position}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Participant ID:</p>
                  <p className="font-mono text-sm">{participant.id}</p>
                </div>
              </div>

              {participant.attendance && participant.attendance.length > 0 && (
                <div>
                  <p className="text-sm mb-2">Attendance History:</p>
                  <div className="space-y-2">
                    {participant.attendance.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                        <span>{att.agendaItem}</span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {new Date(att.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleRecordAttendance} 
                  disabled={isRecording || !selectedAgenda}
                  className="flex-1"
                >
                  {isRecording ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Record Attendance
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => handlePrintBadge()} 
                  variant="outline"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Badge
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <QrCode className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Scan a QR code to view participant details</p>
              <p className="text-sm mt-2">Or enter participant ID manually above</p>
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        @keyframes scan-line {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
        
      #qr-reader video, 
      #qr-reader canvas {
        width: 100% !important;
        height: auto !important; /* Use 'auto' to maintain aspect ratio */
        object-fit: cover; /* This makes the video cover the box nicely */
        min-height: 300px; /* Match your container's min-height */
      }
      `}</style>
    </div>
  );
}
