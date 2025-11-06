/**
 * BadgeDesigner - Advanced Drag-and-Drop Badge Customization Interface
 * 
 * Features:
 * - Visual drag-and-drop canvas with live preview
 * - Component palette for dragging elements onto the badge
 * - Resizable and movable components on canvas
 * - Context-aware styling panel for selected components
 * - Real-time visual feedback
 */

import { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Resizable } from 're-resizable';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { 
  Save, QrCode, Image as ImageIcon, Type, CheckCircle2, 
  Plus, Trash2, Maximize2, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Palette, Move, Upload
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import * as localDB from '../utils/localStorage';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

type BadgeSettings = localDB.BadgeSettings;
type Event = localDB.Event;
type CustomField = localDB.CustomField;

interface BadgeDesignerProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Extended component interface for canvas positioning
interface CanvasComponent {
  id: string;
  type: 'field' | 'qrcode' | 'logo' | 'eventName' | 'customText';
  fieldName?: string;
  label?: string;
  enabled: boolean;
  order: number;
  // Canvas positioning (percentage-based)
  x: number;
  y: number;
  width: number;
  height: number;
  // Component-specific styling
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  customText?: string;
}

// Badge size dimensions in mm
const BADGE_SIZES = {
  CR80: { width: 85.6, height: 53.98, label: 'CR80 (Credit Card)' },
  A6: { width: 105, height: 148, label: 'A6' },
  A7: { width: 74, height: 105, label: 'A7' },
  custom: { width: 100, height: 150, label: 'Custom Size' }
};

const CANVAS_SCALE = 3.5; // Pixel scale factor for better visibility

export function BadgeDesigner({ eventId, isOpen, onClose }: BadgeDesignerProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <BadgeDesignerContent eventId={eventId} isOpen={isOpen} onClose={onClose} />
    </DndProvider>
  );
}

function BadgeDesignerContent({ eventId, isOpen, onClose }: BadgeDesignerProps) {
  const [settings, setSettings] = useState<BadgeSettings | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; label: string }>>([]);
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      loadSettings();
      loadEvent();
    }
  }, [isOpen, eventId]);

  const loadSettings = () => {
    const badgeSettings = localDB.getBadgeSettings(eventId);
    setSettings(badgeSettings);
    
    // Try to load existing canvas layout
    const canvasLayoutStr = localStorage.getItem(`badge_canvas_${eventId}`);
    
    if (canvasLayoutStr) {
      // Load saved canvas layout
      try {
        const savedLayout = JSON.parse(canvasLayoutStr);
        setCanvasComponents(savedLayout);
      } catch (err) {
        console.error('Error loading canvas layout:', err);
        convertOldComponents(badgeSettings);
      }
    } else {
      // Convert old components to canvas components
      convertOldComponents(badgeSettings);
    }
  };

  const convertOldComponents = (badgeSettings: any) => {
    if (badgeSettings.components) {
      const converted = badgeSettings.components.map((c: any, index: number) => ({
        ...c,
        x: 10,
        y: 10 + index * 15,
        width: c.type === 'qrcode' ? 25 : 80,
        height: c.type === 'qrcode' ? 25 : 10,
        fontSize: 16,
        fontFamily: 'sans-serif',
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textAlign: 'center' as const,
        color: '#000000'
      }));
      setCanvasComponents(converted);
    }
  };

  const loadEvent = () => {
    const eventData = localDB.getEventById(eventId);
    setEvent(eventData);
    
    if (eventData) {
      const standardFields = [
        { name: 'name', label: 'Name' },
        { name: 'email', label: 'Email' },
        { name: 'phone', label: 'Phone' },
        { name: 'company', label: 'Company' },
        { name: 'position', label: 'Position' }
      ];
      
      const customFields = (eventData.customFields || []).map(cf => ({
        name: cf.name,
        label: cf.label
      }));
      
      setAvailableFields([...standardFields, ...customFields]);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      // Convert canvas components back to basic components for storage
      const basicComponents = canvasComponents.map(c => ({
        id: c.id,
        type: c.type,
        fieldName: c.fieldName,
        label: c.label,
        enabled: c.enabled,
        order: c.order
      }));
      
      const updatedSettings = {
        ...settings,
        components: basicComponents as any
      };
      
      localDB.updateBadgeSettings(eventId, updatedSettings);
      
      // Also save canvas layout separately
      localStorage.setItem(`badge_canvas_${eventId}`, JSON.stringify(canvasComponents));
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving badge settings:', error);
      alert('Failed to save badge settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<BadgeSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
  };

  const handleComponentDrop = (componentType: string, fieldName?: string, label?: string) => {
    console.log('handleComponentDrop called:', { componentType, fieldName, label });
    
    const newComponent: CanvasComponent = {
      id: Date.now().toString(),
      type: componentType as any,
      fieldName,
      label: label || componentType,
      enabled: true,
      order: canvasComponents.length,
      x: 20,
      y: 20,
      width: componentType === 'qrcode' ? 25 : 60,
      height: componentType === 'qrcode' ? 25 : 12,
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      color: '#000000'
    };
    
    setCanvasComponents(prev => {
      const updated = [...prev, newComponent];
      console.log('Canvas components updated:', updated.length);
      return updated;
    });
    setSelectedComponentId(newComponent.id);
    console.log('Component added and selected:', newComponent.id);
  };

  const updateComponent = (id: string, updates: Partial<CanvasComponent>) => {
    setCanvasComponents(prev =>
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  const deleteComponent = (id: string) => {
    setCanvasComponents(prev => prev.filter(c => c.id !== id));
    if (selectedComponentId === id) {
      setSelectedComponentId(null);
    }
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG or JPG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setIsUploadingBg(true);
    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-bg-${Date.now()}.${fileExt}`;
      const filePath = `badge-backgrounds/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('make-04dd31ce-badge-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('make-04dd31ce-badge-images')
        .getPublicUrl(filePath);

      updateSettings({ backgroundImageUrl: publicUrl });
      
    } catch (error: any) {
      console.error('Error uploading background image:', error);
      alert('Failed to upload image: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploadingBg(false);
    }
  };

  if (!settings || !event) {
    return null;
  }

  const selectedSize = BADGE_SIZES[settings.size];
  const width = settings.size === 'custom' ? settings.customWidth || 100 : selectedSize.width;
  const height = settings.size === 'custom' ? settings.customHeight || 100 : selectedSize.height;
  const canvasWidth = width * CANVAS_SCALE;
  const canvasHeight = height * CANVAS_SCALE;

  const selectedComponent = canvasComponents.find(c => c.id === selectedComponentId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[92vw] max-h-[92vh] w-full overflow-hidden p-0">
        <div className="flex flex-col h-[92vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-white to-gray-50">
            <DialogTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-purple-600" />
              Badge Designer - {event.name}
            </DialogTitle>
            <DialogDescription>
              Drag components onto the canvas and customize their appearance
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[240px_1fr_280px] gap-0 flex-1 overflow-hidden">
          {/* Left Sidebar - Component Palette */}
          <div className="border-r bg-gray-50/50 overflow-y-auto">
            <div className="p-4 space-y-3">
              <div className="bg-white rounded-lg border shadow-sm">
                <div className="px-3 py-2 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                  <h3 className="text-xs font-semibold text-gray-700">Badge Size</h3>
                </div>
                <div className="p-3 space-y-2">
                  <RadioGroup
                    value={settings.size}
                    onValueChange={(value) => updateSettings({ size: value as any })}
                    className="space-y-1.5"
                  >
                    {Object.entries(BADGE_SIZES).map(([key, { label }]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <RadioGroupItem value={key} id={`size-${key}`} />
                        <Label htmlFor={`size-${key}`} className="cursor-pointer text-xs">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {settings.size === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Width (mm)</Label>
                        <Input
                          type="number"
                          value={settings.customWidth || 100}
                          onChange={(e) => updateSettings({ customWidth: parseInt(e.target.value) })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Height (mm)</Label>
                        <Input
                          type="number"
                          value={settings.customHeight || 150}
                          onChange={(e) => updateSettings({ customHeight: parseInt(e.target.value) })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-purple-600 font-medium pt-1">
                    {width.toFixed(1)}mm × {height.toFixed(1)}mm
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border shadow-sm">
                <div className="px-3 py-2 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                  <h3 className="text-xs font-semibold text-gray-700">Component Palette</h3>
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground mb-2">
                    Drag components to canvas
                  </p>

                  <DraggableComponent type="eventName" label="Event Name">
                    <Type className="h-3.5 w-3.5 mr-2" />
                    <span className="text-xs">Event Name</span>
                  </DraggableComponent>

                  <DraggableComponent type="qrcode" label="QR Code">
                    <QrCode className="h-3.5 w-3.5 mr-2" />
                    <span className="text-xs">QR Code</span>
                  </DraggableComponent>

                  <DraggableComponent type="logo" label="Event Logo">
                    <ImageIcon className="h-3.5 w-3.5 mr-2" />
                    <span className="text-xs">Event Logo</span>
                  </DraggableComponent>

                  <div className="my-2 border-t"></div>
                  
                  <p className="text-xs text-gray-600 mb-1.5 font-medium">Participant Fields</p>
                  {availableFields.map(field => (
                    <DraggableComponent
                      key={field.name}
                      type="field"
                      fieldName={field.name}
                      label={field.label}
                    >
                      <Type className="h-3 w-3 mr-2" />
                      <span className="text-xs">{field.label}</span>
                    </DraggableComponent>
                  ))}

                  <div className="my-2 border-t"></div>
                  
                  <DraggableComponent type="customText" label="Custom Text">
                    <Type className="h-3.5 w-3.5 mr-2" />
                    <span className="text-xs">Custom Text</span>
                  </DraggableComponent>
                </div>
              </div>

              <div className="bg-white rounded-lg border shadow-sm">
                <div className="px-3 py-2 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                  <h3 className="text-xs font-semibold text-gray-700">Background</h3>
                </div>
                <div className="p-3 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.backgroundColor}
                        onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                        className="w-10 h-7 p-1"
                      />
                      <Input
                        type="text"
                        value={settings.backgroundColor}
                        onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                        placeholder="#ffffff"
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-2"></div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Background Image</Label>
                    
                    {/* File Upload Button */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingBg}
                        className="h-8 text-xs flex-1 relative overflow-hidden"
                        onClick={() => document.getElementById('bg-file-input')?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-2" />
                        {isUploadingBg ? 'Uploading...' : 'Upload Image'}
                      </Button>
                      <input
                        id="bg-file-input"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleBackgroundImageUpload}
                        className="hidden"
                      />
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-muted-foreground">or use URL</span>
                      </div>
                    </div>
                    
                    <Input
                      type="url"
                      value={settings.backgroundImageUrl || ''}
                      onChange={(e) => updateSettings({ backgroundImageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="h-7 text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a local file or paste image URL
                    </p>

                    {settings.backgroundImageUrl && (
                      <>
                        <div className="space-y-1 pt-1">
                          <Label className="text-xs">Image Fit</Label>
                          <Select
                            value={settings.backgroundImageFit || 'cover'}
                            onValueChange={(value: 'cover' | 'contain') => updateSettings({ backgroundImageFit: value })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cover">Cover (Fill badge)</SelectItem>
                              <SelectItem value="contain">Contain (Fit within)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mt-2 border rounded-md p-2 bg-gray-50">
                          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                          <img 
                            src={settings.backgroundImageUrl} 
                            alt="Background preview"
                            className="w-full h-20 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSettings({ backgroundImageUrl: '', backgroundImageFit: 'cover' })}
                          className="h-7 text-xs w-full"
                        >
                          Remove Image
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Badge Canvas */}
          <div className="flex flex-col bg-gradient-to-br from-gray-100 to-gray-200 overflow-auto">
            <div className="flex-1 flex items-center justify-center p-8 min-h-0">
              <div className="flex flex-col items-center">
                <BadgeCanvas
                  width={canvasWidth}
                  height={canvasHeight}
                  backgroundColor={settings.backgroundColor}
                  backgroundImageUrl={settings.backgroundImageUrl}
                  backgroundImageFit={settings.backgroundImageFit}
                  components={canvasComponents}
                  selectedComponentId={selectedComponentId}
                  onComponentSelect={setSelectedComponentId}
                  onComponentMove={(id, x, y) => updateComponent(id, { x, y })}
                  onComponentResize={(id, width, height) => updateComponent(id, { width, height })}
                  onComponentDrop={handleComponentDrop}
                  event={event}
                />
                <div className="mt-3 px-4 py-1.5 bg-white/90 backdrop-blur rounded-full shadow-sm border">
                  <div className="text-xs font-medium text-gray-600">
                    {width.toFixed(1)}mm × {height.toFixed(1)}mm
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Component Styling */}
          <div className="border-l bg-gray-50/50 overflow-y-auto">
            <div className="p-4">
              {selectedComponent ? (
                <ComponentStylingPanel
                  component={selectedComponent}
                  onUpdate={(updates) => updateComponent(selectedComponent.id, updates)}
                  onDelete={() => deleteComponent(selectedComponent.id)}
                  logoUrl={settings.logoUrl}
                  onLogoUrlChange={(url) => updateSettings({ logoUrl: url })}
                />
              ) : (
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <div className="text-center text-sm text-muted-foreground">
                    <Move className="h-8 w-8 mx-auto mb-2 opacity-50 text-purple-400" />
                    <p className="text-xs">Select a component on the canvas to edit its properties</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t bg-gradient-to-r from-white to-gray-50">
          <Button variant="outline" onClick={onClose} className="px-6">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isSaving ? (
              <>Saving...</>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Draggable Component in Palette
interface DraggableComponentProps {
  type: string;
  fieldName?: string;
  label: string;
  children: React.ReactNode;
}

function DraggableComponent({ type, fieldName, label, children }: DraggableComponentProps) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'BADGE_COMPONENT',
    item: () => {
      console.log('Starting drag:', { type, fieldName, label });
      return { type, fieldName, label };
    },
    end: (item, monitor) => {
      const didDrop = monitor.didDrop();
      console.log('Drag ended:', { didDrop, item });
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [type, fieldName, label]);

  return (
    <div
      ref={drag}
      className={`flex items-center px-2.5 py-1.5 bg-white border rounded-md cursor-move hover:bg-purple-50 hover:border-purple-300 transition-all ${
        isDragging ? 'opacity-30 scale-95' : ''
      }`}
    >
      {children}
    </div>
  );
}

// Badge Canvas
interface BadgeCanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundImageFit?: 'cover' | 'contain';
  components: CanvasComponent[];
  selectedComponentId: string | null;
  onComponentSelect: (id: string) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentResize: (id: string, width: number, height: number) => void;
  onComponentDrop: (type: string, fieldName?: string, label?: string) => void;
  event: Event;
}

function BadgeCanvas({
  width,
  height,
  backgroundColor,
  backgroundImageUrl,
  backgroundImageFit = 'cover',
  components,
  selectedComponentId,
  onComponentSelect,
  onComponentMove,
  onComponentResize,
  onComponentDrop,
  event
}: BadgeCanvasProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'BADGE_COMPONENT',
    drop: (item: any, monitor) => {
      console.log('Drop event triggered!', item);
      if (!monitor.didDrop()) {
        onComponentDrop(item.type, item.fieldName, item.label);
      }
      return { dropped: true };
    },
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }), [onComponentDrop]);

  const backgroundStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor
  };

  if (backgroundImageUrl) {
    backgroundStyle.backgroundImage = `url(${backgroundImageUrl})`;
    backgroundStyle.backgroundSize = backgroundImageFit;
    backgroundStyle.backgroundPosition = 'center';
    backgroundStyle.backgroundRepeat = 'no-repeat';
  }

  return (
    <div
      ref={drop}
      className={`relative border-2 shadow-2xl transition-all rounded-lg overflow-hidden ${
        isOver && canDrop ? 'border-purple-500 ring-4 ring-purple-300 scale-[1.02]' : 'border-gray-400'
      } ${canDrop ? 'cursor-copy' : ''}`}
      style={backgroundStyle}
      onClick={(e) => {
        e.stopPropagation();
        onComponentSelect(null as any);
      }}
    >
      {components.map(component => (
        <CanvasComponentItem
          key={component.id}
          component={component}
          isSelected={selectedComponentId === component.id}
          canvasWidth={width}
          canvasHeight={height}
          onSelect={() => onComponentSelect(component.id)}
          onMove={onComponentMove}
          onResize={onComponentResize}
          event={event}
        />
      ))}
      
      {/* Drop zone indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-purple-100/50 backdrop-blur-[2px] z-10 rounded-lg">
          <div className="text-center text-purple-700 bg-white/80 px-6 py-4 rounded-lg shadow-lg">
            <Plus className="h-12 w-12 mx-auto mb-2 animate-bounce" />
            <p className="font-semibold">Drop here to add component</p>
          </div>
        </div>
      )}

      {components.length === 0 && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <Plus className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Drag components here</p>
            <p className="text-xs mt-1 opacity-70">Start designing your badge</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Canvas Component
interface CanvasComponentItemProps {
  component: CanvasComponent;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  event: Event;
}

function CanvasComponentItem({
  component,
  isSelected,
  canvasWidth,
  canvasHeight,
  onSelect,
  onMove,
  onResize,
  event
}: CanvasComponentItemProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (component.type === 'qrcode') {
      QRCodeLib.toDataURL('SAMPLE-QR-CODE', {
        width: 200,
        margin: 1
      }).then(setQrCodeUrl);
    }
  }, [component.type]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) {
      return; // Don't start drag if clicking resize handle
    }
    
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (component.x / 100) * canvasWidth,
      y: e.clientY - (component.y / 100) * canvasHeight
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = ((e.clientX - dragStart.x) / canvasWidth) * 100;
      const newY = ((e.clientY - dragStart.y) / canvasHeight) * 100;
      onMove(
        component.id,
        Math.max(0, Math.min(100 - component.width, newX)),
        Math.max(0, Math.min(100 - component.height, newY))
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, canvasWidth, canvasHeight, component.id, component.width, component.height, onMove]);

  const handleResizeStop = (e: any, direction: any, ref: any, delta: any) => {
    const newWidth = (ref.offsetWidth / canvasWidth) * 100;
    const newHeight = (ref.offsetHeight / canvasHeight) * 100;
    onResize(component.id, Math.min(100, newWidth), Math.min(100, newHeight));
  };

  const renderContent = () => {
    if (component.type === 'eventName') {
      return (
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            fontSize: `${component.fontSize}px`,
            fontFamily: component.fontFamily,
            fontWeight: component.fontWeight,
            fontStyle: component.fontStyle,
            textAlign: component.textAlign,
            color: component.color
          }}
        >
          {event.name}
        </div>
      );
    }

    if (component.type === 'field') {
      return (
        <div
          className="w-full h-full overflow-hidden"
          style={{
            fontSize: `${component.fontSize}px`,
            fontFamily: component.fontFamily,
            fontWeight: component.fontWeight,
            fontStyle: component.fontStyle,
            textAlign: component.textAlign,
            color: component.color
          }}
        >
          <div className="opacity-60 text-xs">{component.label}</div>
          <div>Sample {component.label}</div>
        </div>
      );
    }

    if (component.type === 'qrcode' && qrCodeUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
        </div>
      );
    }

    if (component.type === 'logo' && event.branding?.logoUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img src={event.branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      );
    }

    if (component.type === 'customText') {
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontSize: `${component.fontSize}px`,
            fontFamily: component.fontFamily,
            fontWeight: component.fontWeight,
            fontStyle: component.fontStyle,
            textAlign: component.textAlign,
            color: component.color
          }}
        >
          {component.customText || 'Custom Text'}
        </div>
      );
    }

    return null;
  };

  return (
    <Resizable
      size={{
        width: `${component.width}%`,
        height: `${component.height}%`
      }}
      onResizeStop={handleResizeStop}
      enable={{
        top: isSelected,
        right: isSelected,
        bottom: isSelected,
        left: isSelected,
        topRight: isSelected,
        bottomRight: isSelected,
        bottomLeft: isSelected,
        topLeft: isSelected
      }}
      minWidth="5%"
      minHeight="3%"
      maxWidth="100%"
      maxHeight="100%"
      style={{
        position: 'absolute',
        left: `${component.x}%`,
        top: `${component.y}%`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      className={`${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 shadow-lg' : 'hover:ring-1 hover:ring-purple-300'}`}
      handleClasses={{
        top: 'resize-handle',
        right: 'resize-handle',
        bottom: 'resize-handle',
        left: 'resize-handle',
        topRight: 'resize-handle',
        bottomRight: 'resize-handle',
        bottomLeft: 'resize-handle',
        topLeft: 'resize-handle'
      }}
    >
      <div 
        ref={componentRef}
        className="w-full h-full relative"
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {renderContent()}
        {isSelected && (
          <div className="absolute -top-7 left-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none shadow-md font-medium">
            {component.label || component.type}
          </div>
        )}
      </div>
    </Resizable>
  );
}

// Component Styling Panel
interface ComponentStylingPanelProps {
  component: CanvasComponent;
  onUpdate: (updates: Partial<CanvasComponent>) => void;
  onDelete: () => void;
  logoUrl?: string;
  onLogoUrlChange: (url: string) => void;
}

function ComponentStylingPanel({
  component,
  onUpdate,
  onDelete,
  logoUrl,
  onLogoUrlChange
}: ComponentStylingPanelProps) {
  const isTextComponent = ['field', 'eventName', 'customText'].includes(component.type);

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-3 py-2.5 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700">Component Settings</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Component Type</Label>
          <p className="text-sm font-medium text-purple-700">{component.label || component.type}</p>
        </div>

        <div className="border-t"></div>

        {component.type === 'customText' && (
          <div className="space-y-1">
            <Label className="text-xs font-medium">Text Content</Label>
            <Input
              value={component.customText || ''}
              onChange={(e) => onUpdate({ customText: e.target.value })}
              placeholder="Enter custom text"
              className="h-8 text-xs"
            />
          </div>
        )}

        {isTextComponent && (
          <>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Font Size</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={component.fontSize || 16}
                  onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                  min={8}
                  max={72}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground font-medium">px</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Font Family</Label>
              <Select
                value={component.fontFamily || 'sans-serif'}
                onValueChange={(value) => onUpdate({ fontFamily: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans-serif">Sans Serif</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium">Style</Label>
                <div className="flex gap-1">
                  <Button
                    variant={component.fontWeight === 'bold' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      onUpdate({
                        fontWeight: component.fontWeight === 'bold' ? 'normal' : 'bold'
                      })
                    }
                    className={`h-8 flex-1 ${component.fontWeight === 'bold' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={component.fontStyle === 'italic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      onUpdate({
                        fontStyle: component.fontStyle === 'italic' ? 'normal' : 'italic'
                      })
                    }
                    className={`h-8 flex-1 ${component.fontStyle === 'italic' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Alignment</Label>
              <div className="flex gap-1">
                <Button
                  variant={component.textAlign === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ textAlign: 'left' })}
                  className={`h-8 flex-1 ${component.textAlign === 'left' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={component.textAlign === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ textAlign: 'center' })}
                  className={`h-8 flex-1 ${component.textAlign === 'center' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={component.textAlign === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ textAlign: 'right' })}
                  className={`h-8 flex-1 ${component.textAlign === 'right' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={component.color || '#000000'}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-10 h-7 p-1"
                />
                <Input
                  type="text"
                  value={component.color || '#000000'}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  placeholder="#000000"
                  className="h-7 text-xs flex-1"
                />
              </div>
            </div>
          </>
        )}

        {component.type === 'logo' && (
          <div className="space-y-1">
            <Label className="text-xs font-medium">Logo URL</Label>
            <Input
              type="url"
              value={logoUrl || ''}
              onChange={(e) => onLogoUrlChange(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="h-7 text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Or set in Event Branding settings
            </p>
          </div>
        )}

        <div className="border-t"></div>

        <div className="bg-purple-50/50 rounded-md p-2.5 space-y-2">
          <p className="text-xs font-medium text-purple-700 mb-1.5">Position & Size</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">X</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={component.x.toFixed(1)}
                  onChange={(e) => onUpdate({ x: parseFloat(e.target.value) })}
                  min={0}
                  max={100}
                  step={0.5}
                  className="h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Y</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={component.y.toFixed(1)}
                  onChange={(e) => onUpdate({ y: parseFloat(e.target.value) })}
                  min={0}
                  max={100}
                  step={0.5}
                  className="h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={component.width.toFixed(1)}
                  onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
                  min={5}
                  max={100}
                  step={0.5}
                  className="h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={component.height.toFixed(1)}
                  onChange={(e) => onUpdate({ height: parseFloat(e.target.value) })}
                  min={3}
                  max={100}
                  step={0.5}
                  className="h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <div className="flex items-center gap-2">
            <Switch
              checked={component.enabled}
              onCheckedChange={(checked) => onUpdate({ enabled: checked })}
            />
            <Label className="text-xs font-medium">Show on badge</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
