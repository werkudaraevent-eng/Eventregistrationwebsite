import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Search, Users, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  registeredAt?: string;
}

type SortField = 'name' | 'email' | 'company' | 'position' | 'registeredAt';
type SortDirection = 'asc' | 'desc' | null;

interface ParticipantSelectorProps {
  eventId: string;
  selectedIds?: string[];
  onSelectionChange: (selectedIds: string[], targetType: 'all' | 'filtered' | 'manual', filters?: any) => void;
}

export default function ParticipantSelector({ eventId, selectedIds: initialSelectedIds = [], onSelectionChange }: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipants();
  }, [eventId]);

  useEffect(() => {
    setSelectedIds(new Set(initialSelectedIds));
  }, [initialSelectedIds]);

  useEffect(() => {
    applyFilters();
  }, [participants, searchQuery, sortField, sortDirection]);

  useEffect(() => {
    // Notify parent of selection changes (always manual type now)
    onSelectionChange(Array.from(selectedIds), 'manual', undefined);
  }, [selectedIds]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      console.log('Fetching participants for eventId:', eventId);
      
      const { data, error } = await supabase
        .from('participants')
        .select('id, name, email, phone, company, position, "registeredAt"')
        .eq('"eventId"', eventId)
        .order('name');

      if (error) {
        console.error('Error fetching participants:', error);
        throw error;
      }

      console.log('Loaded participants:', data?.length || 0, 'participants:', data);

      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...participants];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.company?.toLowerCase().includes(query) ||
        p.position?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue = a[sortField] || '';
        let bValue = b[sortField] || '';
        
        // Convert to lowercase for string comparison
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredParticipants(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction: asc -> desc -> null -> asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-neutral-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 ml-1 text-primary-600" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1 text-primary-600" />;
  };

  const toggleParticipant = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParticipants.map(p => p.id)));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-neutral-600">Loading participants...</p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed border-gray-300 rounded-lg">
        <Users className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No participants found</h3>
          <p className="text-sm text-gray-600 mt-1">Add participants to this event first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-participant-selector="true">
      {/* Selection Summary */}
      <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.size} of {participants.length} selected
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, company, or position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Select All Toggle */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0}
            onCheckedChange={toggleAll}
          />
          <Label className="cursor-pointer text-sm">
            Select All {searchQuery && `(${filteredParticipants.length})`}
          </Label>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="h-7 text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Participants Table - with scroll */}
      <div className="border rounded bg-white overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight: '30vh', overscrollBehavior: 'contain' }}>
          <table className="w-full text-xs border-collapse table-fixed">
            <colgroup>
              <col className="w-12" />
              <col className="w-[15%]" />
              <col className="w-[23%]" />
              <col className="w-[17%]" />
              <col className="w-[15%]" />
              <col className="w-[auto]" />
            </colgroup>
            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
              <tr className="border-b">
                <th className="p-2 text-left bg-gray-100">
                  <Checkbox
                    checked={selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th 
                  className="p-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="p-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 bg-gray-100 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    Email
                    {getSortIcon('email')}
                  </div>
                </th>
                <th 
                  className="p-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 bg-gray-100 select-none"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center">
                    Company
                    {getSortIcon('company')}
                  </div>
                </th>
                <th 
                  className="p-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 bg-gray-100 select-none"
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center">
                    Position
                    {getSortIcon('position')}
                  </div>
                </th>
                <th 
                  className="p-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 bg-gray-100 select-none"
                  onClick={() => handleSort('registeredAt')}
                >
                  <div className="flex items-center">
                    Registered
                    {getSortIcon('registeredAt')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 text-sm">
                    {searchQuery ? 'No participants found matching your search' : 'No participants available'}
                  </td>
                </tr>
              ) : (
                filteredParticipants.map(participant => (
                  <tr
                    key={participant.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedIds.has(participant.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleParticipant(participant.id)}
                  >
                    <td className="p-2">
                      <Checkbox
                        value={participant.id}
                        checked={selectedIds.has(participant.id)}
                        onCheckedChange={() => toggleParticipant(participant.id)}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-2 font-medium text-gray-900 truncate" title={participant.name}>
                      {participant.name}
                    </td>
                    <td className="p-2 text-gray-600 truncate" title={participant.email}>
                      {participant.email}
                    </td>
                    <td className="p-2 text-gray-600 truncate" title={participant.company}>
                      {participant.company || '-'}
                    </td>
                    <td className="p-2 text-gray-600 truncate" title={participant.position}>
                      {participant.position || '-'}
                    </td>
                    <td className="p-2 text-gray-500 whitespace-nowrap">
                      {participant.registeredAt ? new Date(participant.registeredAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short'
                      }) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
