/**
 * BrandingSettings - Dynamic Form Builder & Branding Manager
 * 
 * Two-tab system:
 * 1. Form Fields - Configure registration form fields (auto-sync with participants table)
 * 2. Appearance - Customize branding (logo, colors, fonts)
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { 
  Palette, Upload, Eye, Save, X, List, 
  Edit2, Plus, Settings, Mail,
  ArrowUp, ArrowDown, Lock
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { ColumnManagement } from './ColumnManagement';

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  visible?: boolean;
  options?: string[];
  order: number;
  placeholder?: string;
}

interface BuiltInField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  locked?: boolean;
}

interface BrandingSettings {
  logoUrl?: string;
  logoAlignment?: 'left' | 'center' | 'right';
  logoSize?: 'small' | 'medium' | 'large';
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: 'sans-serif' | 'serif' | 'monospace';
  fontColor?: string;
  buttonColor?: string;
  buttonText?: string;
  formWidth?: 'narrow' | 'medium' | 'wide';
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  fontSize?: 'small' | 'medium' | 'large';
  customHeader?: string;
  successMessage?: string;
  footerText?: string;
  footerColor?: string;
  // Header display settings
  showDate?: boolean;
  showLocation?: boolean;
  showDescription?: boolean;
  // Email confirmation settings
  autoSendConfirmation?: boolean;
  confirmationTemplateId?: string;
}

interface BrandingSettingsProps {
  eventId: string;
  onUpdated?: () => void;
}

export function BrandingSettings({ eventId, onUpdated }: BrandingSettingsProps) {
  // Branding state
  const [branding, setBranding] = useState<BrandingSettings>({
    logoAlignment: 'center',
    logoSize: 'medium',
    primaryColor: '#7C3AED',
    backgroundColor: '#FFFFFF',
    fontFamily: 'sans-serif',
    fontColor: '#1F2937',
    buttonColor: '#7C3AED',
    buttonText: 'Submit Registration',
    formWidth: 'medium',
    borderRadius: 'medium',
    fontSize: 'medium',
    successMessage: 'Thank you for registering! We will contact you soon.',
    footerText: '',
    footerColor: '#6B7280', // Default gray color for footer
    showDate: true,
    showLocation: true,
    showDescription: true,
    autoSendConfirmation: false,
    confirmationTemplateId: ''
  });
  
  // Form fields state
  const [builtInFields, setBuiltInFields] = useState<BuiltInField[]>([
    { name: 'name', label: 'Full Name', type: 'text', required: true, visible: true, locked: true },
    { name: 'email', label: 'Email Address', type: 'email', required: true, visible: true, locked: true },
    { name: 'phone', label: 'Phone Number', type: 'tel', required: false, visible: true },
    { name: 'company', label: 'Company', type: 'text', required: false, visible: true },
    { name: 'position', label: 'Position', type: 'text', required: false, visible: true }
  ]);
  
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Event data for preview
  const [eventData, setEventData] = useState<{ name: string; startDate?: string; location?: string; description?: string } | null>(null);
  
  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  
  // Edit custom field dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  
  // Column Management dialog
  const [showColumnManagement, setShowColumnManagement] = useState(false);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    setIsLoading(true);
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('[BrandingSettings] Error loading event:', error);
        return;
      }

      // Load branding
      if (event.branding) {
        setBranding(event.branding);
      }

      // Load custom fields
      if (event.customFields) {
        const fields = event.customFields.map((f: any) => ({
          ...f,
          visible: f.visible !== false // Default to visible
        }));
        setCustomFields(fields);
      }

      // Load built-in fields visibility and required status
      // fieldRequirements is stored inside branding object
      const fieldReqs = event.branding?.fieldRequirements || {};
      setBuiltInFields(prev => prev.map(f => {
        if (f.name === 'phone') {
          return { 
            ...f, 
            visible: event.columnVisibility?.phone !== false,
            required: fieldReqs.phone ?? false
          };
        }
        if (f.name === 'company') {
          return { 
            ...f, 
            visible: event.columnVisibility?.company !== false,
            required: fieldReqs.company ?? false
          };
        }
        if (f.name === 'position') {
          return { 
            ...f, 
            visible: event.columnVisibility?.position !== false,
            required: fieldReqs.position ?? false
          };
        }
        return f;
      }));

      console.log('[BrandingSettings] Loaded:', { 
        branding: event.branding, 
        customFields: event.customFields,
        fieldRequirements: fieldReqs 
      });

      // Load email templates
      await loadEmailTemplates();
    } catch (err) {
      console.error('[BrandingSettings] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, subject')
        .eq('event_id', eventId)
        .order('name');

      if (error) {
        console.error('[BrandingSettings] Error loading templates:', error);
        return;
      }

      setEmailTemplates(data || []);
    } catch (err) {
      console.error('[BrandingSettings] Template load error:', err);
    }
  };

  // === FORM FIELDS MANAGEMENT ===

  const handleToggleFieldVisibility = (fieldName: string, isBuiltIn: boolean) => {
    if (isBuiltIn) {
      setBuiltInFields(prev => prev.map(f =>
        f.name === fieldName ? { ...f, visible: !f.visible } : f
      ));
    } else {
      setCustomFields(prev => prev.map(f =>
        f.name === fieldName ? { ...f, visible: !f.visible } : f
      ));
    }
  };

  const handleToggleFieldRequired = (fieldName: string, isBuiltIn: boolean) => {
    if (isBuiltIn) {
      setBuiltInFields(prev => prev.map(f =>
        f.name === fieldName && !f.locked ? { ...f, required: !f.required } : f
      ));
    } else {
      setCustomFields(prev => prev.map(f =>
        f.name === fieldName ? { ...f, required: !f.required } : f
      ));
    }
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    setCustomFields(prev => {
      const index = prev.findIndex(f => f.id === fieldId);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newFields = [...prev];
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      
      // Update order
      return newFields.map((f, i) => ({ ...f, order: i }));
    });
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setShowEditDialog(true);
  };

  const handleSaveFieldEdit = async () => {
    if (!editingField) return;

    setCustomFields(prev => prev.map(f =>
      f.id === editingField.id ? editingField : f
    ));

    setShowEditDialog(false);
    setEditingField(null);
  };

  // === BRANDING MANAGEMENT ===

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBranding(prev => ({ ...prev, logoUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setBranding(prev => ({ ...prev, logoUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // === SAVE ALL SETTINGS ===

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('[BrandingSettings] Saving settings:', {
        autoSendConfirmation: branding.autoSendConfirmation,
        confirmationTemplateId: branding.confirmationTemplateId,
        fullBranding: branding
      });
      
      // Prepare columnVisibility from builtInFields (includes visible status)
      const columnVisibility = {
        phone: builtInFields.find(f => f.name === 'phone')?.visible ?? true,
        company: builtInFields.find(f => f.name === 'company')?.visible ?? true,
        position: builtInFields.find(f => f.name === 'position')?.visible ?? true,
        attendance: true, // Not managed by branding settings
        registered: true  // Not managed by branding settings
      };

      // Prepare fieldRequirements from builtInFields (includes required status)
      const fieldRequirements = {
        phone: builtInFields.find(f => f.name === 'phone')?.required ?? false,
        company: builtInFields.find(f => f.name === 'company')?.required ?? false,
        position: builtInFields.find(f => f.name === 'position')?.required ?? false
      };

      // Include fieldRequirements in branding object (to avoid needing new DB column)
      const brandingWithRequirements = {
        ...branding,
        fieldRequirements
      };
      
      // Save branding (with fieldRequirements), custom fields, and column visibility to event
      const { error } = await supabase
        .from('events')
        .update({
          branding: brandingWithRequirements,
          customFields: customFields,
          columnVisibility: columnVisibility
        })
        .eq('id', eventId);

      if (error) throw error;

      console.log('[BrandingSettings] ✅ Settings saved successfully');
      alert('✅ Settings saved successfully!');
      onUpdated?.();
    } catch (err) {
      console.error('[BrandingSettings] Save error:', err);
      alert('❌ Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // === PREVIEW HELPER ===

  const getVisibleFields = () => {
    const visible: any[] = [];
    
    // Built-in fields
    builtInFields.filter(f => f.visible).forEach(f => {
      visible.push({ ...f, isBuiltIn: true });
    });
    
    // Custom fields
    customFields
      .filter(f => f.visible !== false)
      .sort((a, b) => a.order - b.order)
      .forEach(f => {
        visible.push({ ...f, isBuiltIn: false });
      });
    
    return visible;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  // Render the live preview panel (reusable for both tabs)
  const renderLivePreview = () => (
    <div className="border rounded-lg overflow-hidden bg-white sticky top-4">
      <div className="gradient-primary text-white px-4 py-2 flex items-center justify-between">
        <h3 className="font-semibold text-sm">📱 Live Preview</h3>
        <span className="text-xs opacity-80">Real-time preview</span>
      </div>
      <div 
        className="p-4 overflow-y-auto"
        style={{
          maxHeight: 'calc(100vh - 200px)',
          fontFamily: branding.fontFamily,
          backgroundColor: branding.backgroundColor,
          color: branding.fontColor || '#1F2937',
          fontSize: 
            branding.fontSize === 'small' ? '0.875rem' :
            branding.fontSize === 'large' ? '1.125rem' : '1rem'
        }}
      >
        <style>{`
          /* Microsoft Forms-style transparent inputs for preview */
          .preview-form input,
          .preview-form textarea,
          .preview-form button[role="combobox"] {
            background-color: rgba(255, 255, 255, 0.1) !important;
            backdrop-filter: blur(10px);
            border: none !important;
            border-bottom: 2px solid rgba(0, 0, 0, 0.2) !important;
            border-radius: 4px 4px 0 0 !important;
            transition: all 0.3s ease;
          }
          
          .preview-form input:hover,
          .preview-form textarea:hover,
          .preview-form button[role="combobox"]:hover {
            background-color: rgba(255, 255, 255, 0.15) !important;
            border-bottom-color: rgba(0, 0, 0, 0.3) !important;
          }
        `}</style>
        <div 
          className="space-y-4 bg-white/60 backdrop-blur-md p-6 shadow-xl border border-white/20 preview-form"
          style={{
            borderRadius: 
              branding.borderRadius === 'none' ? '0' :
              branding.borderRadius === 'small' ? '4px' :
              branding.borderRadius === 'large' ? '12px' : '8px'
          }}
        >
          {/* Logo */}
          {branding.logoUrl && (
            <div className={`flex ${
              branding.logoAlignment === 'left' ? 'justify-start' :
              branding.logoAlignment === 'right' ? 'justify-end' : 'justify-center'
            } mb-4`}>
              <img 
                src={branding.logoUrl} 
                alt="Logo" 
                className={`${
                  branding.logoSize === 'small' ? 'h-12' :
                  branding.logoSize === 'large' ? 'h-24' : 'h-16'
                } object-contain`}
              />
            </div>
          )}

          {/* Custom Header */}
          {branding.customHeader && (
            <div className="text-center mb-4">
              <p style={{ color: branding.primaryColor }} className="font-semibold text-base">
                {branding.customHeader}
              </p>
            </div>
          )}

          {/* Event Title */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold" style={{ color: branding.fontColor || '#1F2937' }}>
              Sample Event Name
            </h2>
          </div>

          {/* Header Display: Date & Location */}
          {(branding.showDate !== false || branding.showLocation !== false) && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {branding.showDate !== false && (
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: branding.primaryColor ? `${branding.primaryColor}15` : 'rgba(124, 58, 237, 0.1)',
                    color: branding.primaryColor || '#7C3AED'
                  }}
                >
                  📅 Dec 15, 2025
                </div>
              )}
              {branding.showLocation !== false && (
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: branding.primaryColor ? `${branding.primaryColor}15` : 'rgba(124, 58, 237, 0.1)',
                    color: branding.primaryColor || '#7C3AED'
                  }}
                >
                  📍 Jakarta, Indonesia
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {branding.showDescription !== false && (
            <p className="text-center text-xs text-gray-500 mb-4">
              This is a sample event description that will appear on the registration form.
            </p>
          )}

          {getVisibleFields().map((field, index) => (
            <div key={index} className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: branding.fontColor || '#1F2937' }}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea 
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  disabled
                  className="opacity-60"
                  style={{
                    borderRadius: 
                      branding.borderRadius === 'none' ? '0' :
                      branding.borderRadius === 'small' ? '4px' :
                      branding.borderRadius === 'large' ? '12px' : '8px'
                  }}
                />
              ) : field.type === 'select' ? (
                <Select disabled>
                  <SelectTrigger 
                    className="opacity-60"
                    style={{
                      borderRadius: 
                        branding.borderRadius === 'none' ? '0' :
                        branding.borderRadius === 'small' ? '4px' :
                        branding.borderRadius === 'large' ? '12px' : '8px'
                    }}
                  >
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                </Select>
              ) : (
                <Input 
                  type={field.type}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  disabled
                  className="opacity-60"
                  style={{
                    borderRadius: 
                      branding.borderRadius === 'none' ? '0' :
                      branding.borderRadius === 'small' ? '4px' :
                      branding.borderRadius === 'large' ? '12px' : '8px'
                  }}
                />
              )}
            </div>
          ))}

          <Button 
            className="w-full mt-6 text-white font-semibold" 
            disabled
            style={{ 
              backgroundColor: branding.buttonColor || branding.primaryColor,
              borderRadius: 
                branding.borderRadius === 'none' ? '0' :
                branding.borderRadius === 'small' ? '4px' :
                branding.borderRadius === 'large' ? '12px' : '8px'
            }}
          >
            {branding.buttonText || 'Submit Registration'}
          </Button>

          {branding.successMessage && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 text-sm text-center" 
              style={{
                borderRadius: 
                  branding.borderRadius === 'none' ? '0' :
                  branding.borderRadius === 'small' ? '4px' :
                  branding.borderRadius === 'large' ? '12px' : '8px'
              }}
            >
              {branding.successMessage}
            </div>
          )}

          {branding.footerText && (
            <div className="mt-6 text-center text-xs" style={{ color: branding.footerColor || '#6B7280' }}>
              {branding.footerText}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Registration Link Display */}
      <Card className="bg-gradient-to-r from-blue-50 to-primary-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-blue-900 mb-1 block">📋 Public Registration Link</Label>
              <code className="text-xs bg-white px-3 py-2 rounded border border-blue-200 block overflow-x-auto">
                {window.location.origin}/#/register/{eventId}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/#/register/${eventId}`);
                alert('✅ Link copied to clipboard!');
              }}
              className="shrink-0 border-blue-300 hover:bg-blue-100"
            >
              📋 Copy Link
            </Button>
          </div>
          <p className="text-xs text-blue-700 mt-2">Share this link with participants to allow them to self-register</p>
        </CardContent>
      </Card>

      {/* Main 2-Column Layout: Settings (Left) + Preview (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* LEFT: Settings Panel with Tabs */}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fields" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Form Fields
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance & Styling
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: FORM FIELDS */}
            <TabsContent value="fields" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Registration Form Fields</CardTitle>
                  <CardDescription>
                    Configure which fields appear on your public registration form.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Available Fields</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowColumnManagement(true)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage Columns
                      </Button>
                    </div>

                    {/* Built-in Fields */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase">Default Fields</div>
                      {builtInFields.map(field => (
                        <div
                          key={field.name}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{field.label}</span>
                              {field.locked && (
                                <Lock className="h-3 w-3 text-gray-400" />
                              )}
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">Type: {field.type}</div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!field.locked && (
                              <div className="flex items-center gap-1">
                                <Label htmlFor={`req-${field.name}`} className="text-xs">Required</Label>
                                <Switch
                                  id={`req-${field.name}`}
                                  checked={field.required}
                                  onCheckedChange={() => handleToggleFieldRequired(field.name, true)}
                                />
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`vis-${field.name}`} className="text-xs">Visible</Label>
                              <Switch
                                id={`vis-${field.name}`}
                                checked={field.visible}
                                onCheckedChange={() => handleToggleFieldVisibility(field.name, true)}
                                disabled={field.locked}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Custom Fields */}
                    {customFields.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 uppercase">Custom Fields</div>
                        {customFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleMoveField(field.id, 'up')}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleMoveField(field.id, 'down')}
                                disabled={index === customFields.length - 1}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{field.label}</span>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">Type: {field.type}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditField(field)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>

                              <div className="flex items-center gap-1">
                                <Label htmlFor={`req-${field.id}`} className="text-xs">Required</Label>
                                <Switch
                                  id={`req-${field.id}`}
                                  checked={field.required}
                                  onCheckedChange={() => handleToggleFieldRequired(field.name, false)}
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <Label htmlFor={`vis-${field.id}`} className="text-xs">Visible</Label>
                                <Switch
                                  id={`vis-${field.id}`}
                                  checked={field.visible !== false}
                                  onCheckedChange={() => handleToggleFieldVisibility(field.name, false)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowColumnManagement(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Field
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: APPEARANCE */}
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance & Branding</CardTitle>
                  <CardDescription>
                    Customize every aspect of your registration form's look and feel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* LOGO SECTION */}
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Logo Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Event Logo</Label>
                        {branding.logoUrl ? (
                          <div className="flex items-center gap-4">
                            <img src={branding.logoUrl} alt="Logo" className="h-16 object-contain" />
                            <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                              <X className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="logo-upload"
                            />
                            <Label htmlFor="logo-upload" className="cursor-pointer">
                              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                                <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-600">Click to upload logo (Max 2MB)</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG supported</p>
                              </div>
                            </Label>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Logo Alignment</Label>
                          <Select
                            value={branding.logoAlignment}
                            onValueChange={(value: any) => setBranding(prev => ({ ...prev, logoAlignment: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Logo Size</Label>
                          <Select
                            value={branding.logoSize}
                            onValueChange={(value: any) => setBranding(prev => ({ ...prev, logoSize: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small (48px)</SelectItem>
                              <SelectItem value="medium">Medium (64px)</SelectItem>
                              <SelectItem value="large">Large (96px)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HEADER DISPLAY SETTINGS */}
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Header Display
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="font-medium text-sm">Show Event Date</Label>
                        </div>
                        <Switch
                          checked={branding.showDate !== false}
                          onCheckedChange={(checked: boolean) => setBranding(prev => ({ ...prev, showDate: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="font-medium text-sm">Show Location</Label>
                        </div>
                        <Switch
                          checked={branding.showLocation !== false}
                          onCheckedChange={(checked: boolean) => setBranding(prev => ({ ...prev, showLocation: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="font-medium text-sm">Show Description</Label>
                        </div>
                        <Switch
                          checked={branding.showDescription !== false}
                          onCheckedChange={(checked: boolean) => setBranding(prev => ({ ...prev, showDescription: checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLOR SCHEME */}
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Scheme
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={branding.primaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-12 h-9 cursor-pointer p-1"
                          />
                          <Input
                            type="text"
                            value={branding.primaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Background</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={branding.backgroundColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, backgroundColor: e.target.value }))}
                            className="w-12 h-9 cursor-pointer p-1"
                          />
                          <Input
                            type="text"
                            value={branding.backgroundColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, backgroundColor: e.target.value }))}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={branding.fontColor || '#1F2937'}
                            onChange={(e) => setBranding(prev => ({ ...prev, fontColor: e.target.value }))}
                            className="w-12 h-9 cursor-pointer p-1"
                          />
                          <Input
                            type="text"
                            value={branding.fontColor || '#1F2937'}
                            onChange={(e) => setBranding(prev => ({ ...prev, fontColor: e.target.value }))}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Button Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={branding.buttonColor || branding.primaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, buttonColor: e.target.value }))}
                            className="w-12 h-9 cursor-pointer p-1"
                          />
                          <Input
                            type="text"
                            value={branding.buttonColor || branding.primaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, buttonColor: e.target.value }))}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TYPOGRAPHY & LAYOUT */}
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Typography & Layout
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm">Font Family</Label>
                        <Select
                          value={branding.fontFamily}
                          onValueChange={(value: any) => setBranding(prev => ({ ...prev, fontFamily: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sans-serif">Sans Serif</SelectItem>
                            <SelectItem value="serif">Serif</SelectItem>
                            <SelectItem value="monospace">Monospace</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Font Size</Label>
                        <Select
                          value={branding.fontSize || 'medium'}
                          onValueChange={(value: any) => setBranding(prev => ({ ...prev, fontSize: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Form Width</Label>
                        <Select
                          value={branding.formWidth || 'medium'}
                          onValueChange={(value: any) => setBranding(prev => ({ ...prev, formWidth: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="narrow">Narrow</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="wide">Wide</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Border Radius</Label>
                        <Select
                          value={branding.borderRadius || 'medium'}
                          onValueChange={(value: any) => setBranding(prev => ({ ...prev, borderRadius: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* CUSTOM TEXT */}
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Edit2 className="h-4 w-4" />
                      Custom Text
                    </h3>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm">Custom Header</Label>
                        <Input
                          placeholder="Welcome message..."
                          value={branding.customHeader || ''}
                          onChange={(e) => setBranding(prev => ({ ...prev, customHeader: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Button Text</Label>
                        <Input
                          placeholder="Submit Registration"
                          value={branding.buttonText || 'Submit Registration'}
                          onChange={(e) => setBranding(prev => ({ ...prev, buttonText: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Success Message</Label>
                        <Textarea
                          placeholder="Message shown after registration..."
                          value={branding.successMessage || ''}
                          onChange={(e) => setBranding(prev => ({ ...prev, successMessage: e.target.value }))}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Footer Text</Label>
                          <Input
                            placeholder="Contact info..."
                            value={branding.footerText || ''}
                            onChange={(e) => setBranding(prev => ({ ...prev, footerText: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Footer Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={branding.footerColor || '#6B7280'}
                              onChange={(e) => setBranding(prev => ({ ...prev, footerColor: e.target.value }))}
                              className="w-12 h-9 cursor-pointer p-1"
                            />
                            <Input
                              type="text"
                              value={branding.footerColor || '#6B7280'}
                              onChange={(e) => setBranding(prev => ({ ...prev, footerColor: e.target.value }))}
                              className="flex-1 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* EMAIL CONFIRMATION */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Confirmation
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="font-medium text-sm">Auto Send Confirmation</Label>
                          <p className="text-xs text-gray-500">Send email when someone registers</p>
                        </div>
                        <Switch
                          checked={branding.autoSendConfirmation || false}
                          onCheckedChange={(checked: boolean) => setBranding(prev => ({ ...prev, autoSendConfirmation: checked }))}
                        />
                      </div>

                      {branding.autoSendConfirmation && (
                        <div className="space-y-2 pl-3 border-l-2 border-primary-300">
                          <Label className="text-sm">Email Template</Label>
                          <Select
                            value={branding.confirmationTemplateId || ''}
                            onValueChange={(value: string) => setBranding(prev => ({ ...prev, confirmationTemplateId: value }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {emailTemplates.length === 0 ? (
                                <SelectItem value="" disabled>No templates</SelectItem>
                              ) : (
                                emailTemplates.map(template => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {emailTemplates.length === 0 && (
                            <p className="text-xs text-amber-600">
                              ⚠️ Create templates in Email Center first.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: Persistent Live Preview */}
        <div style={{ minWidth: 0 }}>
          {renderLivePreview()}
        </div>
      </div>

      {/* Save Button - Always Visible */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/register/${eventId}`, '_blank')}
          variant="outline"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview Form
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="gradient-primary hover:opacity-90">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {/* Column Management Dialog */}
      <Dialog open={showColumnManagement} onOpenChange={setShowColumnManagement}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
            <DialogDescription>
              Add, edit, or remove custom fields for your participants table
            </DialogDescription>
          </DialogHeader>
          <ColumnManagement 
            eventId={eventId} 
            onFieldsUpdated={() => {
              loadEventData();
              setShowColumnManagement(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Custom Field Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>
              Customize the field properties
            </DialogDescription>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Field Label</Label>
                <Input
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Placeholder Text</Label>
                <Input
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  placeholder="Enter hint text..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFieldEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
