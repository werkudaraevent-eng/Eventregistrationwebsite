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
import { Resizable } from 're-resizable';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { 
  Save, QrCode, Image as ImageIcon, Type, CheckCircle2, 
  Plus, Trash2, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Move, Upload, Minus
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import QRCodeLib from 'qrcode';
import localDB from '../utils/localDBStub';
import type { BadgeSettings, Event } from '../utils/localDBStub';

interface BadgeDesignerProps {
  eventId: string;
  onClose?: () => void;
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

// Utility function for color readability
const ensureReadableColor = (value?: string): string => {
  if (!value) return '#000000';
  const normalized = value.trim().toLowerCase();
  if (normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') {
    return '#000000';
  }
  return value;
};

export function BadgeDesigner({ eventId, onClose }: BadgeDesignerProps) {
  return <BadgeDesignerContent eventId={eventId} onClose={onClose} />;
}

function BadgeDesignerContent({ eventId, onClose }: BadgeDesignerProps) {
  const [settings, setSettings] = useState<BadgeSettings | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; label: string }>>([]);
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  useEffect(() => {
    if (eventId) {
      loadSettings();
      loadEvent();
    }
  }, [eventId]);

  const normalizeComponent = (component: any): CanvasComponent => ({
    ...component,
    fontSize: component.fontSize ?? 16,
    fontFamily: component.fontFamily ?? 'sans-serif',
    fontWeight: component.fontWeight ?? 'normal',
    fontStyle: component.fontStyle ?? 'normal',
    textAlign: component.textAlign ?? 'center',
    color: ensureReadableColor(component.color)
  });

  const loadSettings = () => {
    const storedSettings = localDB.getBadgeSettings(eventId);
    const normalizedSettings = {
      ...storedSettings,
      backgroundColor: storedSettings.backgroundColor || '#f3f4f6'
    };
    setSettings(normalizedSettings);
    
    const canvasLayoutStr = localStorage.getItem(`badge_canvas_${eventId}`);
    
    if (canvasLayoutStr) {
      try {
        const savedLayout = JSON.parse(canvasLayoutStr);
        setCanvasComponents(savedLayout.map((component: CanvasComponent) => normalizeComponent(component)));
      } catch (err) {
        console.error('Error loading canvas layout:', err);
        convertOldComponents(normalizedSettings);
      }
    } else {
      convertOldComponents(normalizedSettings);
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
      })).map(normalizeComponent);
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
        onClose?.();
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

  const addComponentToCanvas = (
    componentType: string,
    clientX?: number,
    clientY?: number,
    fieldName?: string,
    label?: string
  ) => {
    if (!canvasWidth || !canvasHeight) {
      console.warn('Canvas dimensions not ready; skipping component add.');
      return;
    }

    const dropX = clientX ?? canvasWidth / 2;
    const dropY = clientY ?? canvasHeight / 2;

    const componentWidth = componentType === 'qrcode' ? 25 : 60;
    const componentHeight = componentType === 'qrcode' ? 25 : 12;

    const xPercent = Math.max(
      0,
      Math.min(100 - componentWidth, (dropX / canvasWidth) * 100)
    );
    const yPercent = Math.max(
      0,
      Math.min(100 - componentHeight, (dropY / canvasHeight) * 100)
    );

    const newComponent: CanvasComponent = {
      id: Date.now().toString(),
      type: componentType as any,
      fieldName,
      label: label || componentType,
      enabled: true,
      order: canvasComponents.length,
      x: xPercent,
      y: yPercent,
      width: componentWidth,
      height: componentHeight,
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      color: '#000000'
    };

    const normalized = normalizeComponent(newComponent);
    setCanvasComponents(prev => [...prev, normalized]);
    setSelectedComponentId(normalized.id);
  };

  const updateComponent = (id: string, updates: Partial<CanvasComponent>) => {
    setCanvasComponents(prev =>
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  const handlePaletteAdd = (componentType: string, fieldName?: string, label?: string) => {
    addComponentToCanvas(componentType, canvasWidth / 2, canvasHeight / 2, fieldName, label);
  };

  const clampZoom = (value: number) => Math.min(2, Math.max(0.5, value));

  const applyZoom = (value: number) => {
    const clamped = parseFloat(clampZoom(value).toFixed(2));
    setZoomLevel(clamped);
  };

  const incrementZoom = (delta: number) => {
    applyZoom(zoomLevel + delta);
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
      // TODO: Implement Supabase image upload using proper client
      // For now, create a local data URL placeholder
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        updateSettings({ backgroundImageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
      
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

  const selectedSize = BADGE_SIZES[settings.size || 'CR80'];
  const width = settings.size === 'custom' ? settings.customWidth || 100 : selectedSize.width;
  const height = settings.size === 'custom' ? settings.customHeight || 100 : selectedSize.height;
  const canvasWidth = width * CANVAS_SCALE;
  const canvasHeight = height * CANVAS_SCALE;

  const selectedComponent = canvasComponents.find(c => c.id === selectedComponentId);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white overflow-hidden">
      <header className="flex-shrink-0 px-10 py-6 border-b border-white/15 bg-white/10 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              <Type className="h-6 w-6 text-purple-300" />
              Badge Designer – {event.name}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Click palette items to add them to the badge and customize their appearance in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-10 px-5 border-white/40 text-white bg-white/10 hover:bg-white/20 hover:text-white"
            >
              Exit Designer
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 px-6 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 hover:from-purple-500/90 hover:to-indigo-500/90 text-white border-none"
            >
              {isSaving ? (
                <>Saving…</>
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
      </header>

      <main className="flex-1 min-h-0 px-10 py-8 overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 max-w-[1600px] gap-6">
          {/* Left Sidebar - Component Palette */}
          <section className="flex h-full min-h-0 w-[280px] flex-shrink-0 basis-[280px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-xl">
            <div className="flex h-full flex-col gap-4 p-4">
              <Accordion type="multiple" defaultValue={['size', 'palette']} className="flex flex-col gap-4">
                <AccordionItem value="size" className="border border-slate-200 border-b-0 rounded-2xl bg-white shadow-sm">
                  <AccordionTrigger className="px-4 text-sm font-semibold text-slate-700">
                    Badge Size
                  </AccordionTrigger>
                  <AccordionContent className="px-4 max-h-[calc(100vh-320px)] overflow-y-auto">
                    <div className="space-y-3">
                      <RadioGroup
                        value={settings.size}
                        onValueChange={(value: string) => updateSettings({ size: value as any })}
                        className="space-y-2"
                      >
                        {Object.entries(BADGE_SIZES).map(([key, { label }]) => (
                          <label
                            key={key}
                            htmlFor={`size-${key}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
                          >
                            <RadioGroupItem value={key} id={`size-${key}`} />
                            <span>{label}</span>
                          </label>
                        ))}
                      </RadioGroup>

                      {settings.size === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Width (mm)</Label>
                            <Input
                              type="number"
                              value={settings.customWidth || 100}
                              onChange={(e) => updateSettings({ customWidth: parseInt(e.target.value) })}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Height (mm)</Label>
                            <Input
                              type="number"
                              value={settings.customHeight || 150}
                              onChange={(e) => updateSettings({ customHeight: parseInt(e.target.value) })}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-xs font-semibold text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
                        Preview size: {width.toFixed(1)}mm × {height.toFixed(1)}mm
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="palette" className="border border-slate-200 border-b-0 rounded-2xl bg-white shadow-sm">
                  <AccordionTrigger className="px-4 text-sm font-semibold text-slate-700">
                    Component Palette
                  </AccordionTrigger>
                  <AccordionContent className="px-4 max-h-[calc(100vh-320px)] overflow-y-auto">
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        Click a component to drop it onto the badge canvas.
                      </p>

                      <PaletteItem type="eventName" label="Event Name" onAdd={handlePaletteAdd}>
                        <Type className="h-3.5 w-3.5 mr-2 text-purple-500" />
                        <span className="text-sm">Event Name</span>
                      </PaletteItem>

                      <PaletteItem type="qrcode" label="QR Code" onAdd={handlePaletteAdd}>
                        <QrCode className="h-3.5 w-3.5 mr-2 text-purple-500" />
                        <span className="text-sm">QR Code</span>
                      </PaletteItem>

                      <PaletteItem type="logo" label="Event Logo" onAdd={handlePaletteAdd}>
                        <ImageIcon className="h-3.5 w-3.5 mr-2 text-purple-500" />
                        <span className="text-sm">Event Logo</span>
                      </PaletteItem>

                      <div className="border-t my-3"></div>

                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Participant Fields</p>
                      {availableFields.map(field => (
                        <PaletteItem
                          key={field.name}
                          type="field"
                          fieldName={field.name}
                          label={field.label}
                          onAdd={handlePaletteAdd}
                        >
                          <Type className="h-3 w-3 mr-2 text-purple-500" />
                          <span className="text-sm">{field.label}</span>
                        </PaletteItem>
                      ))}

                      <div className="border-t my-3"></div>

                      <PaletteItem type="customText" label="Custom Text" onAdd={handlePaletteAdd}>
                        <Type className="h-3.5 w-3.5 mr-2 text-purple-500" />
                        <span className="text-sm">Custom Text</span>
                      </PaletteItem>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="background" className="border border-slate-200 border-b-0 rounded-2xl bg-white shadow-sm">
                  <AccordionTrigger className="px-4 text-sm font-semibold text-slate-700">
                    Background
                  </AccordionTrigger>
                  <AccordionContent className="px-4 max-h-[calc(100vh-320px)] overflow-y-auto">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-600">Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.backgroundColor}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            className="w-12 h-9 p-1 rounded-lg border border-slate-200"
                          />
                          <Input
                            type="text"
                            value={settings.backgroundColor}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            placeholder="#ffffff"
                            className="h-9 text-sm flex-1"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-2"></div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-600">Background Image</Label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUploadingBg}
                            className="h-9 text-xs flex-1 border-purple-200 text-purple-600 hover:bg-purple-50"
                            onClick={() => document.getElementById('bg-file-input')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploadingBg ? 'Uploading…' : 'Upload Image'}
                          </Button>
                          <input
                            id="bg-file-input"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handleBackgroundImageUpload}
                            className="hidden"
                          />
                        </div>

                        <div className="relative text-xs text-slate-500">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t"></span>
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-white px-2">or use URL</span>
                          </div>
                        </div>

                        <Input
                          type="url"
                          value={settings.backgroundImageUrl || ''}
                          onChange={(e) => updateSettings({ backgroundImageUrl: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                          className="h-9 text-sm"
                        />
                        <p className="text-xs text-slate-500">
                          Upload a local file or paste an image URL.
                        </p>

                        {settings.backgroundImageUrl && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-slate-600">Image Fit</Label>
                              <Select
                                value={settings.backgroundImageFit || 'cover'}
                                onValueChange={(value: 'cover' | 'contain') => updateSettings({ backgroundImageFit: value })}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cover">Cover (fill badge)</SelectItem>
                                  <SelectItem value="contain">Contain (fit within)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2">
                              <p className="text-xs font-semibold text-slate-500 mb-1">Preview</p>
                              <img
                                src={settings.backgroundImageUrl}
                                alt="Background preview"
                                className="w-full h-24 object-cover rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSettings({ backgroundImageUrl: '', backgroundImageFit: 'cover' })}
                              className="h-9 text-xs w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                              Remove Image
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Center - Badge Canvas */}
          <section className="flex min-h-0 min-w-0 flex-[0_0_55%] basis-[55%] max-w-[55%] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Canvas Preview</h2>
                <p className="text-xs text-slate-500">
                  Zoom to fine-tune positions and drag components directly on the badge.
                </p>
              </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded-full border border-slate-200 px-3 py-1.5 text-slate-700 shadow-sm">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => incrementZoom(-0.1)}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={zoomLevel}
                  onChange={(event) => applyZoom(parseFloat(event.target.value))}
                  className="w-36 accent-purple-500"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => incrementZoom(0.1)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-8 pb-10 overflow-auto">
              <div
                className="relative transform transition-transform duration-200 ease-out"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
              >
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
                  event={event}
                />
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-xs font-medium border border-slate-200">
                <span>Current size:</span>
                <span>{width.toFixed(1)}mm × {height.toFixed(1)}mm</span>
              </div>
            </div>
          </section>

          {/* Right Sidebar - Component Styling */}
          <section className="flex h-full min-h-0 w-[280px] flex-shrink-0 basis-[280px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-xl">
            <div className="flex-1 overflow-y-auto p-6">
              {selectedComponent ? (
                <ComponentStylingPanel
                  component={selectedComponent}
                  onUpdate={(updates) => updateComponent(selectedComponent.id, updates)}
                  onDelete={() => deleteComponent(selectedComponent.id)}
                  logoUrl={settings.logoUrl}
                  onLogoUrlChange={(url) => updateSettings({ logoUrl: url })}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center text-sm text-slate-500">
                  <div>
                    <Move className="h-10 w-10 mx-auto mb-3 text-purple-400 opacity-70" />
                    <p>Select a component on the canvas to edit its properties.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// Palette Component Button
interface PaletteItemProps {
  type: string;
  fieldName?: string;
  label: string;
  onAdd: (type: string, fieldName?: string, label?: string) => void;
  children: React.ReactNode;
}

function PaletteItem({ type, fieldName, label, onAdd, children }: PaletteItemProps) {
  return (
    <button
      type="button"
      onClick={() => onAdd(type, fieldName, label)}
      className="w-full flex items-center px-2.5 py-1.5 bg-white border rounded-md hover:bg-purple-50 hover:border-purple-300 transition-all text-left text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1"
    >
      {children}
    </button>
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
  event
}: BadgeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);

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

  const gridOverlayStyle: React.CSSProperties = {
    backgroundSize: '20px 20px',
    backgroundImage:
      'linear-gradient(to right, rgba(124, 58, 237, 0.15) 1px, transparent 1px), ' +
      'linear-gradient(to bottom, rgba(124, 58, 237, 0.15) 1px, transparent 1px)',
    opacity: 0.25
  };

  return (
    <div
      ref={canvasRef}
      data-badge-canvas="true"
      className="relative border-2 border-gray-400 shadow-2xl transition-all rounded-lg overflow-hidden bg-white cursor-default"
      style={backgroundStyle}
      onClick={(e) => {
        e.stopPropagation();
        onComponentSelect(null as any);
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={gridOverlayStyle}
        aria-hidden="true"
      />

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

      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <Plus className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Click components to add them</p>
            <p className="text-xs mt-1 opacity-70">They will appear centered on the badge</p>
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

  const handleResizeStop = (_e: any, _direction: any, ref: any, _delta: any) => {
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
            color: ensureReadableColor(component.color)
          }}
        >
          {(component.customText && component.customText.trim().length > 0) ? component.customText : event.name}
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
            color: ensureReadableColor(component.color)
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
            color: ensureReadableColor(component.color)
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
        data-component-id={component.id}
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
  const accordionDefaults = [
    ...(isTextComponent ? ['text'] as string[] : []),
    'position',
    ...(component.type === 'logo' ? ['logo'] : [])
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Component Settings</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Component Type</Label>
          <p className="text-sm font-semibold text-purple-700">{component.label || component.type}</p>
        </div>

        <Accordion type="multiple" defaultValue={accordionDefaults} className="flex flex-col gap-3">
          {isTextComponent && (
            <AccordionItem value="text" className="border border-slate-200 border-b-0 rounded-xl bg-white shadow-inner">
              <AccordionTrigger className="px-3 text-sm font-semibold text-slate-700">
                Text & Formatting
              </AccordionTrigger>
              <AccordionContent className="px-3 max-h-\[calc(100vh-360px)\] overflow-y-auto space-y-4">
                {(component.type === 'customText' || component.type === 'eventName') && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">
                      {component.type === 'eventName' ? 'Display Text Override' : 'Text Content'}
                    </Label>
                    <Input
                      value={component.customText || ''}
                      onChange={(e) => onUpdate({ customText: e.target.value })}
                      placeholder={component.type === 'eventName' ? 'Leave blank to use event name' : 'Enter custom text'}
                      className="h-9 text-sm"
                    />
                    {component.type === 'eventName' && (
                      <p className="text-[11px] text-slate-500">
                        Leaving this empty will display the event name automatically.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Font Size</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={component.fontSize || 16}
                      onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                      min={8}
                      max={72}
                      className="h-9 text-sm"
                    />
                    <span className="text-xs text-slate-500 font-medium">px</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Font Family</Label>
                  <Select
                    value={component.fontFamily || 'sans-serif'}
                    onValueChange={(value: string) => onUpdate({ fontFamily: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
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

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Style</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={component.fontWeight === 'bold' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        onUpdate({
                          fontWeight: component.fontWeight === 'bold' ? 'normal' : 'bold'
                        })
                      }
                      className={`h-9 flex-1 ${component.fontWeight === 'bold' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : ''}`}
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
                      className={`h-9 flex-1 ${component.fontStyle === 'italic' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : ''}`}
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Alignment</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={component.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onUpdate({ textAlign: 'left' })}
                      className={`h-9 flex-1 ${component.textAlign === 'left' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : ''}`}
                    >
                      <AlignLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={component.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onUpdate({ textAlign: 'center' })}
                      className={`h-9 flex-1 ${component.textAlign === 'center' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : ''}`}
                    >
                      <AlignCenter className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={component.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onUpdate({ textAlign: 'right' })}
                      className={`h-9 flex-1 ${component.textAlign === 'right' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : ''}`}
                    >
                      <AlignRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={component.color || '#1f2937'}
                      onChange={(e) => onUpdate({ color: e.target.value })}
                      className="w-12 h-9 p-1 rounded-lg border border-slate-200"
                    />
                    <Input
                      type="text"
                      value={component.color || '#1f2937'}
                      onChange={(e) => onUpdate({ color: e.target.value })}
                      placeholder="#1f2937"
                      className="h-9 text-sm flex-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="position" className="border border-slate-200 border-b-0 rounded-xl bg-white shadow-inner">
            <AccordionTrigger className="px-3 text-sm font-semibold text-slate-700">
              Position & Size
            </AccordionTrigger>
            <AccordionContent className="px-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Position X (%)</Label>
                  <Input
                    type="number"
                    value={component.x.toFixed(1)}
                    onChange={(e) => onUpdate({ x: parseFloat(e.target.value) })}
                    min={0}
                    max={100}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Position Y (%)</Label>
                  <Input
                    type="number"
                    value={component.y.toFixed(1)}
                    onChange={(e) => onUpdate({ y: parseFloat(e.target.value) })}
                    min={0}
                    max={100}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Width (%)</Label>
                  <Input
                    type="number"
                    value={component.width.toFixed(1)}
                    onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
                    min={5}
                    max={100}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Height (%)</Label>
                  <Input
                    type="number"
                    value={component.height.toFixed(1)}
                    onChange={(e) => onUpdate({ height: parseFloat(e.target.value) })}
                    min={3}
                    max={100}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 border-t pt-3">
                <Switch
                  checked={component.enabled}
                  onCheckedChange={(checked: boolean | 'indeterminate') => onUpdate({ enabled: checked as boolean })}
                />
                <Label className="text-xs font-semibold text-slate-600">Show on badge</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {component.type === 'logo' && (
            <AccordionItem value="logo" className="border border-slate-200 border-b-0 rounded-xl bg-white shadow-inner">
              <AccordionTrigger className="px-3 text-sm font-semibold text-slate-700">
                Logo Options
              </AccordionTrigger>
              <AccordionContent className="px-3 space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Logo URL</Label>
                <Input
                  type="url"
                  value={logoUrl || ''}
                  onChange={(e) => onLogoUrlChange(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="h-9 text-sm"
                />
                <p className="text-xs text-slate-500">
                  Or set in Event Branding settings.
                </p>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
}
