/**
 * ColumnManagement - Interface for managing custom participant fields
 * 
 * Allows event organizers to:
 * - Add new custom fields to participant records
 * - Edit existing custom fields
 * - Delete custom fields
 * - Reorder field display order
 * - Differentiate between system and custom fields
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Trash2, Plus, Settings2, Loader2, AlertCircle, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import * as supabaseDB from '../utils/supabaseDataLayer';
import type { CustomField, ColumnVisibility } from '../utils/supabaseDataLayer';

interface ColumnManagementProps {
  eventId: string;
  onFieldsUpdated: () => void;
}

export function ColumnManagement({ eventId, onFieldsUpdated }: ColumnManagementProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    phone: true,
    company: true,
    position: true,
    attendance: true,
    registered: true,
    emailStatus: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [newField, setNewField] = useState({
    name: '',
    label: '',
    type: 'text' as CustomField['type'],
    required: false,
    options: ''
  });

  useEffect(() => {
    loadCustomFields();
    loadColumnVisibility();
  }, [eventId]);

  const loadCustomFields = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fields = await supabaseDB.getCustomFields(eventId);
      setCustomFields(fields);
    } catch (err) {
      console.error('Error loading custom fields:', err);
      setError('Failed to load custom fields');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadColumnVisibility = async () => {
    try {
      // Get branding/event settings from Supabase
      const event = await supabaseDB.getEventById(eventId);
      if (event?.columnVisibility) {
        setColumnVisibility(event.columnVisibility);
      }
    } catch (err) {
      console.error('Error loading column visibility:', err);
    }
  };
  
  const handleColumnVisibilityChange = async (column: keyof ColumnVisibility, visible: boolean) => {
    try {
      const updated = { ...columnVisibility, [column]: visible };
      setColumnVisibility(updated);
      await supabaseDB.updateEvent(eventId, { columnVisibility: updated });
      onFieldsUpdated();
    } catch (err) {
      console.error('Error updating column visibility:', err);
      setError('Failed to update column visibility');
    }
  };

  const handleAddField = async () => {
    if (!newField.name.trim() || !newField.label.trim()) {
      setError('Please enter both field name and label');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const fieldData: Omit<CustomField, 'id' | 'order'> = {
        name: newField.name.toLowerCase().replace(/\s+/g, '_'),
        label: newField.label,
        type: newField.type,
        required: newField.required,
        options: newField.type === 'select' && newField.options
          ? newField.options.split(',').map(o => o.trim()).filter(Boolean)
          : undefined
      };

      await supabaseDB.addCustomField(eventId, fieldData);
      
      // Reset form
      setNewField({
        name: '',
        label: '',
        type: 'text',
        required: false,
        options: ''
      });
      
      await loadCustomFields();
      onFieldsUpdated();
    } catch (err: any) {
      console.error('Error adding field:', err);
      setError(err.message || 'Failed to add field');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field? All data in this field will be lost.')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await supabaseDB.deleteCustomField(eventId, fieldId);
      await loadCustomFields();
      onFieldsUpdated();
    } catch (err: any) {
      console.error('Error deleting field:', err);
      setError(err.message || 'Failed to delete field');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setNewField({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options ? field.options.join(', ') : ''
    });
  };

  const handleUpdateField = async () => {
    if (!editingField || !newField.label.trim()) {
      setError('Please enter field label');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const fieldData: Partial<CustomField> = {
        label: newField.label,
        type: newField.type,
        required: newField.required,
        options: newField.type === 'select' && newField.options
          ? newField.options.split(',').map(o => o.trim()).filter(Boolean)
          : undefined
      };

      await supabaseDB.updateCustomField(eventId, editingField.id, fieldData);
      
      // Reset form and editing state
      setEditingField(null);
      setNewField({
        name: '',
        label: '',
        type: 'text',
        required: false,
        options: ''
      });
      
      await loadCustomFields();
      onFieldsUpdated();
    } catch (err: any) {
      console.error('Error updating field:', err);
      setError(err.message || 'Failed to update field');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setNewField({
      name: '',
      label: '',
      type: 'text',
      required: false,
      options: ''
    });
  };

  const handleReorder = async (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = customFields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= customFields.length) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const reordered = [...customFields];
      const [removed] = reordered.splice(currentIndex, 1);
      reordered.splice(newIndex, 0, removed);

      await supabaseDB.reorderCustomFields(eventId, reordered.map(f => f.id));
      await loadCustomFields();
      onFieldsUpdated();
    } catch (err: any) {
      console.error('Error reordering fields:', err);
      setError(err.message || 'Failed to reorder fields');
    } finally {
      setIsLoading(false);
    }
  };

  const systemFields = [
    { key: null, name: 'ID', description: 'Unique participant identifier', alwaysVisible: true },
    { key: null, name: 'Name', description: 'Participant full name', alwaysVisible: true },
    { key: null, name: 'Email', description: 'Email address', alwaysVisible: true },
    { key: 'phone' as keyof ColumnVisibility, name: 'Phone', description: 'Phone number', alwaysVisible: false },
    { key: 'company' as keyof ColumnVisibility, name: 'Company', description: 'Company name', alwaysVisible: false },
    { key: 'position' as keyof ColumnVisibility, name: 'Position', description: 'Job title/position', alwaysVisible: false },
    { key: 'attendance' as keyof ColumnVisibility, name: 'Attendance', description: 'Session check-ins and selected sessions', alwaysVisible: false },
    { key: 'registered' as keyof ColumnVisibility, name: 'Registered At', description: 'Registration timestamp', alwaysVisible: false },
    { key: 'emailStatus' as keyof ColumnVisibility, name: 'Campaign/Email Status', description: 'Email campaigns sent to participant', alwaysVisible: false }
  ];

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        size="sm"
      >
        <Settings2 className="mr-2 h-4 w-4" />
        Manage Columns
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Participant Columns</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-y-auto space-y-6">
            {/* System Fields */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                SYSTEM FIELDS
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                ID, Name, and Email are always visible. Toggle other fields to show/hide them in the participant table.
              </p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32 text-center">Visibility</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemFields.map(field => (
                      <TableRow key={field.name}>
                        <TableCell className="font-medium">{field.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {field.description}
                        </TableCell>
                        <TableCell className="text-center">
                          {field.alwaysVisible ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Always Visible
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Checkbox
                                checked={columnVisibility[field.key!]}
                                onCheckedChange={(checked: boolean | 'indeterminate') => 
                                  handleColumnVisibilityChange(field.key!, checked as boolean)
                                }
                              />
                              <span className="text-xs text-muted-foreground">
                                {columnVisibility[field.key!] ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Custom Fields */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                CUSTOM FIELDS
              </h3>
              
              {customFields.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    No custom fields yet. Add one below to get started.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-20">Required</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customFields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleReorder(field.id, 'up')}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleReorder(field.id, 'down')}
                                disabled={index === customFields.length - 1}
                              >
                                ↓
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{field.label}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {field.name}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded capitalize">
                              {field.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            {field.required ? (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                Yes
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                No
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditField(field)}
                                className="h-8 w-8 p-0 text-blue-600"
                                title="Edit field"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteField(field.id)}
                                className="h-8 w-8 p-0 text-destructive"
                                title="Delete field"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Add/Edit Field Form */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="text-sm font-semibold mb-4">
                {editingField ? 'Edit Custom Field' : 'Add New Custom Field'}
              </h3>
              
              {editingField && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    Editing field: <span className="font-semibold">{editingField.label}</span>
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field-label">Field Label *</Label>
                  <Input
                    id="field-label"
                    placeholder="e.g., Dietary Preferences"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Display name shown to users
                  </p>
                </div>

                <div>
                  <Label htmlFor="field-name">Field Name *</Label>
                  <Input
                    id="field-name"
                    placeholder="e.g., dietary_preferences"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    disabled={!!editingField}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingField ? 'Cannot be changed' : 'Internal identifier (lowercase, no spaces)'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="field-type">Field Type</Label>
                  <Select
                    value={newField.type}
                    onValueChange={(value: string) => setNewField({ ...newField, type: value as CustomField['type'] })}
                  >
                    <SelectTrigger id="field-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="tel">Phone</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="textarea">Long Text</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newField.type === 'select' && (
                  <div>
                    <Label htmlFor="field-options">Options (comma-separated)</Label>
                    <Input
                      id="field-options"
                      placeholder="Option 1, Option 2, Option 3"
                      value={newField.options}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="field-required"
                    checked={newField.required}
                    onCheckedChange={(checked: boolean | 'indeterminate') => 
                      setNewField({ ...newField, required: checked as boolean })
                    }
                  />
                  <Label htmlFor="field-required" className="cursor-pointer">
                    Required field
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {editingField ? (
                  <>
                    <Button
                      onClick={handleUpdateField}
                      size="sm"
                      disabled={isLoading}
                      className="gradient-primary"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Field
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleAddField}
                    size="sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Field
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
