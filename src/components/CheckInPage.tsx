import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, QrCode, BarChart3, ArrowLeft, Loader2, CheckCircle2, X, Camera, Clock } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as localDB from '../utils/localStorage';

type AgendaItem = localDB.AgendaItem;
type Participant = localDB.Participant;

interface CheckInPageProps {
  agenda: AgendaItem;
  onBack: () => void;
}

export function CheckInPage({ agenda, onBack }: CheckInPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [checkedInParticipants, setCheckedInParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchParticipants();
    
    return () => {
      stopCamera();
    };
  }, []);

  const fetchParticipants = async () => {
    setIsLoading(true);
    try {
      console.log('[LOCAL] Fetching participants from localStorage');
      const allParticipants = localDB.getAllParticipants();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch participants');
      }

      setParticipants(data.participants || []);
      
      // Filter checked-in participants for this agenda
      const checkedIn = (data.participants || []).filter((p: Participant) =>
        p.attendance && p.attendance.some(a => a.agendaItem === agenda.title)
      );
      setCheckedInParticipants(checkedIn);
    } catch (err: any) {
      console.error('Error fetching participants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = participants.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.email.toLowerCase().includes(query.toLowerCase()) ||
      p.company?.toLowerCase().includes(query.toLowerCase())
    );
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
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-checkin");
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
          console.log("QR Code detected:", decodedText);
          
          setScanSuccess(true);
          
          await stopCamera();
          
          setTimeout(async () => {
            setScanSuccess(false);
            await handleCheckIn(decodedText);
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

  const handleCheckIn = async (participantId: string) => {
    setIsRecording(true);
    try {
      console.log('[LOCAL] Recording attendance for:', participantId, agenda.title);
      localDB.recordAttendance(participantId, agenda.title);
      
      const participant = localDB.getParticipantById(participantId);
      if (!participant) {
        throw new Error('Participant not found');
      }

      // Show success message
      alert(`✅ Check-in successful for ${participant.name}`);
      
      // Refresh participants list
      await fetchParticipants();
      
      // Close dialogs
      setShowScanDialog(false);
      setShowSearchDialog(false);
    } catch (err: any) {
      console.error('Error recording attendance:', err);
      alert(err.message || 'Failed to record attendance');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Event Info */}
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
      <div className="max-w-2xl mx-auto mt-16 text-center text-white/70 text-sm">
        <p>✓ {checkedInParticipants.length} participants checked in</p>
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
                    <p>No participants found</p>
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
                id="qr-reader-checkin" 
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
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Camera will start automatically</p>
                  </div>
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
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-3xl mb-1">{checkedInParticipants.length}</div>
                  <div className="text-sm text-muted-foreground">Checked In</div>
                </div>
                <div>
                  <div className="text-3xl mb-1">{participants.length}</div>
                  <div className="text-sm text-muted-foreground">Total Registered</div>
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
    </div>
  );
}
