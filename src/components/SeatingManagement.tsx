/**
 * SeatingManagement - Table-based seating arrangement
 * 
 * Features:
 * - Create/manage seating layouts (multiple per event)
 * - Visual table chart with seat status
 * - Click to assign/unassign participants
 * - Real-time occupancy stats
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  Users, 
  Table2, 
  Edit2, 
  Trash2, 
  RefreshCw,
  UserPlus,
  UserMinus,
  LayoutGrid,
  Settings,
  ArrowRightLeft
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface SeatingLayout {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  agenda_id?: string;
  is_active: boolean;
  created_at: string;
}

interface SeatingTable {
  id: string;
  layout_id: string;
  name: string;
  capacity: number;
  table_type: string;
  position_x: number;
  position_y: number;
  notes?: string;
}

interface SeatAssignment {
  id: string;
  table_id: string;
  seat_number: number;
  participant_id?: string;
  label?: string;
  is_blocked: boolean;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface SeatingManagementProps {
  eventId: string;
}

export default function SeatingManagement({ eventId }: SeatingManagementProps) {
  const [layouts, setLayouts] = useState<SeatingLayout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<SeatingLayout | null>(null);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [unassignedParticipants, setUnassignedParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showMoveConfirmDialog, setShowMoveConfirmDialog] = useState(false);
  const [editingLayout, setEditingLayout] = useState<SeatingLayout | null>(null);
  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<{ tableId: string; seatNumber: number } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ participantId: string; assignmentId: string; participantName: string; fromSeat: string } | null>(null);
  
  // Form states
  const [layoutForm, setLayoutForm] = useState({ name: '', description: '' });
  const [tableForm, setTableForm] = useState({ name: '', capacity: 10 });

  useEffect(() => {
    fetchLayouts();
    fetchParticipants();
  }, [eventId]);

  useEffect(() => {
    if (selectedLayout) {
      fetchTables();
    }
  }, [selectedLayout]);

  useEffect(() => {
    if (tables.length > 0) {
      fetchAssignments();
    }
  }, [tables]);

  useEffect(() => {
    // Calculate unassigned and assigned participants
    const assignedIds = new Set(assignments.filter(a => a.participant_id).map(a => a.participant_id));
    setUnassignedParticipants(participants.filter(p => !assignedIds.has(p.id)));
  }, [assignments, participants]);

  // Get assigned participants with their seat info
  const getAssignedParticipants = () => {
    return assignments
      .filter(a => a.participant_id)
      .map(a => {
        const participant = participants.find(p => p.id === a.participant_id);
        const table = tables.find(t => t.id === a.table_id);
        return {
          ...participant,
          seatInfo: `${table?.name} - Seat ${a.seat_number}`,
          assignmentId: a.id,
          tableId: a.table_id,
          seatNumber: a.seat_number
        };
      })
      .filter(p => p.id); // Filter out any undefined
  };

  const generateId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  };

  const fetchLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('seating_layouts')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLayouts(data || []);
      
      // Auto-select first layout
      if (data && data.length > 0 && !selectedLayout) {
        setSelectedLayout(data[0]);
      }
    } catch (error) {
      console.error('Error fetching layouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    if (!selectedLayout) return;
    
    try {
      const { data, error } = await supabase
        .from('seating_tables')
        .select('*')
        .eq('layout_id', selectedLayout.id)
        .order('name');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const fetchAssignments = async () => {
    if (tables.length === 0) return;
    
    try {
      const tableIds = tables.map(t => t.id);
      const { data, error } = await supabase
        .from('seat_assignments')
        .select('*')
        .in('table_id', tableIds);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id, name, email, company')
        .eq('eventId', eventId)
        .order('name');

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };


  // === LAYOUT CRUD ===
  const handleSaveLayout = async () => {
    try {
      if (editingLayout) {
        // Update
        const { error } = await supabase
          .from('seating_layouts')
          .update({ name: layoutForm.name, description: layoutForm.description })
          .eq('id', editingLayout.id);
        if (error) throw error;
      } else {
        // Create
        const newLayout = {
          id: generateId('lay'),
          event_id: eventId,
          name: layoutForm.name,
          description: layoutForm.description,
          is_active: true
        };
        const { error } = await supabase.from('seating_layouts').insert(newLayout);
        if (error) throw error;
      }
      
      setShowLayoutDialog(false);
      setEditingLayout(null);
      setLayoutForm({ name: '', description: '' });
      fetchLayouts();
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Failed to save layout');
    }
  };

  const handleDeleteLayout = async (layout: SeatingLayout) => {
    if (!confirm(`Delete layout "${layout.name}"? This will delete all tables and assignments.`)) return;
    
    try {
      const { error } = await supabase.from('seating_layouts').delete().eq('id', layout.id);
      if (error) throw error;
      
      if (selectedLayout?.id === layout.id) {
        setSelectedLayout(null);
        setTables([]);
        setAssignments([]);
      }
      fetchLayouts();
    } catch (error) {
      console.error('Error deleting layout:', error);
      alert('Failed to delete layout');
    }
  };

  // === TABLE CRUD ===
  const handleSaveTable = async () => {
    if (!selectedLayout) return;
    
    try {
      if (editingTable) {
        // Update
        const { error } = await supabase
          .from('seating_tables')
          .update({ name: tableForm.name, capacity: tableForm.capacity })
          .eq('id', editingTable.id);
        if (error) throw error;
      } else {
        // Create table
        const newTable = {
          id: generateId('tbl'),
          layout_id: selectedLayout.id,
          name: tableForm.name,
          capacity: tableForm.capacity,
          table_type: 'round'
        };
        const { data: tableData, error: tableError } = await supabase
          .from('seating_tables')
          .insert(newTable)
          .select()
          .single();
        if (tableError) throw tableError;

        // Create empty seat assignments
        const seatAssignments = Array.from({ length: tableForm.capacity }, (_, i) => ({
          id: generateId('seat'),
          table_id: tableData.id,
          seat_number: i + 1,
          is_blocked: false
        }));
        const { error: seatsError } = await supabase.from('seat_assignments').insert(seatAssignments);
        if (seatsError) throw seatsError;
      }
      
      setShowTableDialog(false);
      setEditingTable(null);
      setTableForm({ name: '', capacity: 10 });
      fetchTables();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Failed to save table');
    }
  };

  const handleDeleteTable = async (table: SeatingTable) => {
    if (!confirm(`Delete "${table.name}"? This will remove all seat assignments.`)) return;
    
    try {
      const { error } = await supabase.from('seating_tables').delete().eq('id', table.id);
      if (error) throw error;
      fetchTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Failed to delete table');
    }
  };

  // === SEAT ASSIGNMENT ===
  const handleSeatClick = (tableId: string, seatNumber: number) => {
    setSelectedSeat({ tableId, seatNumber });
    setShowAssignDialog(true);
  };

  const handleAssignSeat = async (participantId: string | null, moveFromAssignmentId?: string) => {
    if (!selectedSeat) return;
    
    try {
      // If moving from another seat, clear the old assignment first
      if (moveFromAssignmentId) {
        const { error: clearError } = await supabase
          .from('seat_assignments')
          .update({ participant_id: null })
          .eq('id', moveFromAssignmentId);
        if (clearError) throw clearError;
      }

      const existingAssignment = assignments.find(
        a => a.table_id === selectedSeat.tableId && a.seat_number === selectedSeat.seatNumber
      );

      if (existingAssignment) {
        // Update existing
        const { error } = await supabase
          .from('seat_assignments')
          .update({ participant_id: participantId })
          .eq('id', existingAssignment.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from('seat_assignments').insert({
          id: generateId('seat'),
          table_id: selectedSeat.tableId,
          seat_number: selectedSeat.seatNumber,
          participant_id: participantId,
          is_blocked: false
        });
        if (error) throw error;
      }
      
      setShowAssignDialog(false);
      setSelectedSeat(null);
      fetchAssignments();
    } catch (error) {
      console.error('Error assigning seat:', error);
      alert('Failed to assign seat');
    }
  };

  // Handle move request - show confirmation first
  const handleMoveRequest = (participantId: string, assignmentId: string, participantName: string, fromSeat: string) => {
    setPendingMove({ participantId, assignmentId, participantName, fromSeat });
    setShowMoveConfirmDialog(true);
  };

  // Confirm and execute move
  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    await handleAssignSeat(pendingMove.participantId, pendingMove.assignmentId);
    setShowMoveConfirmDialog(false);
    setPendingMove(null);
  };

  // === HELPERS ===
  const getTableAssignments = (tableId: string) => {
    return assignments.filter(a => a.table_id === tableId);
  };

  const getSeatAssignment = (tableId: string, seatNumber: number) => {
    return assignments.find(a => a.table_id === tableId && a.seat_number === seatNumber);
  };

  const getParticipantName = (participantId: string) => {
    const p = participants.find(p => p.id === participantId);
    return p?.name || 'Unknown';
  };

  const getOccupancyStats = () => {
    const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
    const occupiedSeats = assignments.filter(a => a.participant_id).length;
    const percentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
    return { total: totalSeats, occupied: occupiedSeats, percentage };
  };

  const stats = getOccupancyStats();


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <LayoutGrid className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Seating Arrangement</h2>
            <p className="text-sm text-gray-600 mt-1">Manage table seating for your event</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setEditingLayout(null);
              setLayoutForm({ name: '', description: '' });
              setShowLayoutDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Layout
          </Button>
        </div>
      </div>

      {/* Layout Selector & Stats */}
      {layouts.length > 0 ? (
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <Label className="text-sm text-gray-600 mb-1 block">Select Layout</Label>
            <Select
              value={selectedLayout?.id || ''}
              onValueChange={(value) => {
                const layout = layouts.find(l => l.id === value);
                setSelectedLayout(layout || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a layout..." />
              </SelectTrigger>
              <SelectContent>
                {layouts.map(layout => (
                  <SelectItem key={layout.id} value={layout.id}>
                    {layout.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedLayout && (
            <>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingLayout(selectedLayout);
                    setLayoutForm({ name: selectedLayout.name, description: selectedLayout.description || '' });
                    setShowLayoutDialog(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLayout(selectedLayout)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              {/* Stats */}
              <div className="ml-auto flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{tables.length}</div>
                  <div className="text-xs text-gray-500">Tables</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{stats.occupied}/{stats.total}</div>
                  <div className="text-xs text-gray-500">Seats Filled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.percentage}%</div>
                  <div className="text-xs text-gray-500">Occupancy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{unassignedParticipants.length}</div>
                  <div className="text-xs text-gray-500">Unassigned</div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <LayoutGrid className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No seating layouts yet</h3>
            <p className="text-gray-600 mb-4">Create your first seating layout to start arranging tables</p>
            <Button onClick={() => setShowLayoutDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Layout
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tables Grid */}
      {selectedLayout && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Tables</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingTable(null);
                setTableForm({ name: `Table ${tables.length + 1}`, capacity: 10 });
                setShowTableDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>

          {tables.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Table2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">No tables yet. Add your first table.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tables.map(table => {
                const tableAssignments = getTableAssignments(table.id);
                const occupied = tableAssignments.filter(a => a.participant_id).length;
                
                return (
                  <Card key={table.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{table.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditingTable(table);
                              setTableForm({ name: table.name, capacity: table.capacity });
                              setShowTableDialog(true);
                            }}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDeleteTable(table)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {occupied}/{table.capacity} seats filled
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Seats Grid - Circular arrangement for round table */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {Array.from({ length: table.capacity }, (_, i) => {
                          const seatNum = i + 1;
                          const assignment = getSeatAssignment(table.id, seatNum);
                          const isOccupied = !!assignment?.participant_id;
                          const isBlocked = assignment?.is_blocked;
                          
                          return (
                            <button
                              key={seatNum}
                              onClick={() => handleSeatClick(table.id, seatNum)}
                              className={`
                                w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium
                                transition-all duration-200 border-2
                                ${isBlocked 
                                  ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' 
                                  : isOccupied 
                                    ? 'bg-primary-100 border-primary-500 text-primary-700 hover:bg-primary-200' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50'
                                }
                              `}
                              title={isOccupied ? getParticipantName(assignment!.participant_id!) : `Seat ${seatNum} - Empty`}
                            >
                              {isOccupied ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                seatNum
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Layout Dialog */}
      <Dialog open={showLayoutDialog} onOpenChange={setShowLayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLayout ? 'Edit Layout' : 'Create New Layout'}</DialogTitle>
            <DialogDescription>
              A layout represents a seating arrangement for a specific session or day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Layout Name</Label>
              <Input
                placeholder="e.g., Gala Dinner, Day 1 Session"
                value={layoutForm.name}
                onChange={(e) => setLayoutForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description..."
                value={layoutForm.description}
                onChange={(e) => setLayoutForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLayoutDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveLayout} disabled={!layoutForm.name.trim()}>
              {editingLayout ? 'Save Changes' : 'Create Layout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
            <DialogDescription>
              Configure the table name and number of seats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Table Name</Label>
              <Input
                placeholder="e.g., Table 1, VIP Table"
                value={tableForm.name}
                onChange={(e) => setTableForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Seats</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={tableForm.capacity}
                onChange={(e) => setTableForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTable} disabled={!tableForm.name.trim()}>
              {editingTable ? 'Save Changes' : 'Add Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seat Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Seat</DialogTitle>
            <DialogDescription>
              {selectedSeat && (
                <>
                  {tables.find(t => t.id === selectedSeat.tableId)?.name} - Seat {selectedSeat.seatNumber}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSeat && (() => {
            const currentAssignment = getSeatAssignment(selectedSeat.tableId, selectedSeat.seatNumber);
            const currentParticipant = currentAssignment?.participant_id 
              ? participants.find(p => p.id === currentAssignment.participant_id)
              : null;
            const assignedParticipants = getAssignedParticipants();
            
            return (
              <div className="space-y-4">
                {currentParticipant && (
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <div className="text-sm text-gray-600">Currently assigned to:</div>
                    <div className="font-medium">{currentParticipant.name}</div>
                    <div className="text-sm text-gray-500">{currentParticipant.email}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleAssignSeat(null)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Assignment
                    </Button>
                  </div>
                )}
                
                <Tabs defaultValue="unassigned" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="unassigned" className="text-xs">
                      <UserPlus className="h-3 w-3 mr-1" />
                      Belum Ada Kursi ({unassignedParticipants.length})
                    </TabsTrigger>
                    <TabsTrigger value="assigned" className="text-xs">
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      Pindah Kursi ({assignedParticipants.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="unassigned" className="mt-2">
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {unassignedParticipants.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Semua peserta sudah punya kursi
                        </div>
                      ) : (
                        unassignedParticipants.map(p => (
                          <button
                            key={p.id}
                            onClick={() => handleAssignSeat(p.id)}
                            className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-gray-500">{p.email}</div>
                            {p.company && <div className="text-xs text-gray-400">{p.company}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="assigned" className="mt-2">
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {assignedParticipants.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Belum ada peserta yang punya kursi
                        </div>
                      ) : (
                        assignedParticipants.map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => handleMoveRequest(p.id, p.assignmentId, p.name, p.seatInfo)}
                            className="w-full p-3 text-left hover:bg-amber-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{p.name}</div>
                                <div className="text-xs text-gray-500">{p.email}</div>
                              </div>
                              <Badge variant="outline" className="text-xs bg-amber-50">
                                {p.seatInfo}
                              </Badge>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ Memilih peserta akan memindahkan dari kursi sebelumnya
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Confirmation Dialog */}
      <Dialog open={showMoveConfirmDialog} onOpenChange={setShowMoveConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pindah Kursi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin memindahkan peserta ini?
            </DialogDescription>
          </DialogHeader>
          
          {pendingMove && selectedSeat && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{pendingMove.participantName}</div>
                <div className="text-sm text-gray-500 mt-1">
                  <span className="text-amber-600">{pendingMove.fromSeat}</span>
                  <span className="mx-2">→</span>
                  <span className="text-green-600">
                    {tables.find(t => t.id === selectedSeat.tableId)?.name} - Seat {selectedSeat.seatNumber}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMoveConfirmDialog(false);
                setPendingMove(null);
              }}
            >
              Batal
            </Button>
            <Button onClick={handleConfirmMove}>
              Ya, Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
