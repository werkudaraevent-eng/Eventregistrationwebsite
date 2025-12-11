/**
 * BadgeDesigner - Advanced Drag-and-Drop Badge Customization Interface
 * 
 * REDESIGNED UI LAYOUT:
 * - Top Toolbar: Badge size, orientation, zoom, undo/redo, Export button
 * - Left Rail (64px): Icon-based component palette with tooltips
 * - Center Canvas: Maximized design area
 * - Right Panel: Context-aware component properties
 * - Export Modal: Print settings separated from design view
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { 
  Save, QrCode, Image as ImageIcon, Type, CheckCircle2, 
  Plus, Trash2, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Minus, Undo2, Redo2, MousePointer2, 
  RotateCw, Download, ChevronDown,
  Calendar, User, Mail, Phone, Building, Briefcase,
  FileText, FolderOpen, Copy, LayoutTemplate, Pencil
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import QRCodeLib from 'qrcode';
// localDB import removed - now using Supabase exclusively
import { supabase } from '../utils/supabase/client';
import type { BadgeSettings, Event, PaperSizeConfiguration } from '../utils/localDBStub';
import { DEFAULT_PRINT_CONFIG } from '../utils/localDBStub';
import { BadgePrintSettings } from './BadgePrintSettings';
import { saveBadgeTemplate, loadBadgeTemplates, deleteBadgeTemplate, type BadgeTemplate } from './BadgeTemplateSelector';
import { ResizableTextComponent } from './ResizableTextComponent';
import { toast } from 'sonner';


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
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  customText?: string;
  rotation?: number;
}

// Badge size dimensions in mm
const BADGE_SIZES = {
  CR80: { width: 85.6, height: 53.98, label: 'CR80 (Credit Card)' },
  B1: { width: 85, height: 55, label: 'B1 (85x55mm)' },
  B2: { width: 105, height: 65, label: 'B2 (105x65mm)' },
  B3: { width: 105, height: 80, label: 'B3 (105x80mm)' },
  B4: { width: 130, height: 90, label: 'B4 (130x90mm)' },
  A1: { width: 55, height: 90, label: 'A1 (55x90mm)' },
  A2: { width: 65, height: 95, label: 'A2 (65x95mm)' },
  A3: { width: 80, height: 100, label: 'A3 (80x100mm)' },
  A6: { width: 105, height: 148, label: 'A6 Paper' },
  A7: { width: 74, height: 105, label: 'A7 Paper' },
  custom: { width: 100, height: 150, label: 'Custom Size' }
};

const CANVAS_SCALE = 3.5;

// Preserve the original color - don't convert white to black
// Users may intentionally use white text on dark backgrounds
const ensureReadableColor = (value?: string): string => {
  if (!value) return '#000000';
  return value;
};

/**
 * AABB (Axis-Aligned Bounding Box) Utilities for Rotated Elements
 * 
 * These functions calculate the actual visual footprint of rotated elements
 * for accurate boundary/collision detection.
 */

interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Calculate the Axis-Aligned Bounding Box (AABB) of a rotated rectangle.
 * Returns the visual bounds after rotation.
 */
function getRotatedBoundingBox(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angleDeg: number
): BoundingBox {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const halfW = width / 2;
  const halfH = height / 2;
  
  // 4 corners in local space (relative to center)
  const corners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const corner of corners) {
    const rotatedX = corner.x * cos - corner.y * sin;
    const rotatedY = corner.x * sin + corner.y * cos;
    const globalX = centerX + rotatedX;
    const globalY = centerY + rotatedY;
    minX = Math.min(minX, globalX);
    maxX = Math.max(maxX, globalX);
    minY = Math.min(minY, globalY);
    maxY = Math.max(maxY, globalY);
  }
  
  return { left: minX, right: maxX, top: minY, bottom: maxY };
}

/**
 * Constrain a rotated element to stay within canvas bounds using AABB.
 * Returns adjusted center coordinates.
 */
function constrainRotatedToCanvas(
  proposedCenterX: number,
  proposedCenterY: number,
  width: number,
  height: number,
  angleDeg: number,
  canvasWidth: number = 100,
  canvasHeight: number = 100
): { x: number; y: number } {
  const aabb = getRotatedBoundingBox(proposedCenterX, proposedCenterY, width, height, angleDeg);
  
  let dx = 0, dy = 0;
  
  if (aabb.left < 0) dx = -aabb.left;
  else if (aabb.right > canvasWidth) dx = canvasWidth - aabb.right;
  
  if (aabb.top < 0) dy = -aabb.top;
  else if (aabb.bottom > canvasHeight) dy = canvasHeight - aabb.bottom;
  
  return {
    x: proposedCenterX + dx,
    y: proposedCenterY + dy,
  };
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;
const MIN_WIDTH_PERCENT = 5;
const MIN_HEIGHT_PERCENT = 3;

/**
 * ANCHOR & MOUSE MIDPOINT RESIZE ALGORITHM
 * Guarantees the anchor stays PERFECTLY fixed during resize.
 */
interface ResizeResult {
  newWidth: number;
  newHeight: number;
  newCenterX: number;
  newCenterY: number;
}

function calculateAnchorBasedResize(
  mouseGlobalX: number,
  mouseGlobalY: number,
  centerX: number,
  centerY: number,
  currentWidth: number,
  currentHeight: number,
  angleDeg: number,
  handle: HandlePosition,
  minWidth: number,
  minHeight: number
): ResizeResult {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const halfW = currentWidth / 2;
  const halfH = currentHeight / 2;

  const controlsWidth = ['e', 'w', 'ne', 'nw', 'se', 'sw'].includes(handle);
  const controlsHeight = ['n', 's', 'ne', 'nw', 'se', 'sw'].includes(handle);
  const isRightSide = ['e', 'ne', 'se'].includes(handle);
  const isBottomSide = ['s', 'se', 'sw'].includes(handle);

  // STEP 1: Calculate ANCHOR point in GLOBAL space (opposite to handle)
  const anchorLocalX = controlsWidth ? (isRightSide ? -halfW : halfW) : 0;
  const anchorLocalY = controlsHeight ? (isBottomSide ? -halfH : halfH) : 0;
  const Ax = centerX + (anchorLocalX * cos - anchorLocalY * sin);
  const Ay = centerY + (anchorLocalX * sin + anchorLocalY * cos);

  // STEP 2: Project mouse onto element's local axis
  const mouseRelX = mouseGlobalX - Ax;
  const mouseRelY = mouseGlobalY - Ay;
  const mouseLocalX = mouseRelX * cos + mouseRelY * sin;
  const mouseLocalY = -mouseRelX * sin + mouseRelY * cos;
  
  // Strict axis locking
  let projectedLocalX = controlsWidth ? mouseLocalX : 0;
  let projectedLocalY = controlsHeight ? mouseLocalY : 0;
  
  // Enforce minimum dimensions
  if (controlsWidth) {
    if (isRightSide && projectedLocalX < minWidth) projectedLocalX = minWidth;
    if (!isRightSide && projectedLocalX > -minWidth) projectedLocalX = -minWidth;
  }
  if (controlsHeight) {
    if (isBottomSide && projectedLocalY < minHeight) projectedLocalY = minHeight;
    if (!isBottomSide && projectedLocalY > -minHeight) projectedLocalY = -minHeight;
  }
  
  // Rotate back to global space
  const activeEdgeX = Ax + (projectedLocalX * cos - projectedLocalY * (-sin));
  const activeEdgeY = Ay + (projectedLocalX * sin + projectedLocalY * cos);

  // STEP 3: New center = midpoint between anchor and active edge
  const newCenterX = (Ax + activeEdgeX) / 2;
  const newCenterY = (Ay + activeEdgeY) / 2;

  // STEP 4: Calculate new dimensions
  let newWidth = currentWidth;
  let newHeight = currentHeight;
  
  if (controlsWidth) newWidth = Math.abs(projectedLocalX);
  if (controlsHeight) newHeight = Math.abs(projectedLocalY);

  return { newWidth, newHeight, newCenterX, newCenterY };
}

/**
 * Dynamic cursor based on handle position and element rotation
 */
const HANDLE_BASE_ANGLES: Record<HandlePosition, number> = {
  n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315,
};

const ANGLE_TO_CURSOR = [
  'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize',
  'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize',
];

function getCursorForHandle(handle: HandlePosition, rotationDeg: number): string {
  const baseAngle = HANDLE_BASE_ANGLES[handle];
  let effectiveAngle = (baseAngle + rotationDeg) % 360;
  if (effectiveAngle < 0) effectiveAngle += 360;
  const index = Math.floor(((effectiveAngle + 22.5) % 360) / 45);
  return ANGLE_TO_CURSOR[index];
}

export function BadgeDesigner({ eventId }: BadgeDesignerProps) {
  return <BadgeDesignerContent eventId={eventId} />;
}


function BadgeDesignerContent({ eventId }: BadgeDesignerProps) {
  const [settings, setSettings] = useState<BadgeSettings | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; label: string }>>([]);
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAutoZoom, setIsAutoZoom] = useState(true);
  const [printConfiguration, setPrintConfiguration] = useState<PaperSizeConfiguration>(DEFAULT_PRINT_CONFIG);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [fieldsExpanded, setFieldsExpanded] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // Template management
  const [savedTemplates, setSavedTemplates] = useState<BadgeTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [currentTemplateName, setCurrentTemplateName] = useState<string>('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showNewDesignConfirm, setShowNewDesignConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track last saved state to detect actual changes (prevents false positives on load)
  const lastSavedStateRef = useRef<string>('');
  
  // Undo/Redo history
  const [history, setHistory] = useState<CanvasComponent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50;

  const normalizeComponent = (component: any): CanvasComponent => ({
    ...component,
    fontSize: component.fontSize ?? 16,
    fontFamily: component.fontFamily ?? 'sans-serif',
    fontWeight: component.fontWeight ?? 'normal',
    fontStyle: component.fontStyle ?? 'normal',
    textAlign: component.textAlign ?? 'center',
    color: ensureReadableColor(component.color)
  });


  // Removed loadSettings - now loading exclusively from Supabase in loadEvent


  const loadEvent = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error loading event:', error);
        return;
      }

      if (data) {
        const eventData: Event = {
          id: data.id,
          name: data.name,
          description: data.description,
          startDate: data.start_date,
          endDate: data.end_date,
          location: data.location,
          customFields: data.customFields || data.custom_fields || [],
          branding: data.branding || {}
        };
        
        setEvent(eventData);
        
        const standardFields = [
          { name: 'name', label: 'Name' },
          { name: 'email', label: 'Email' },
          { name: 'phone', label: 'Phone' },
          { name: 'company', label: 'Company' },
          { name: 'position', label: 'Position' }
        ];
        
        const eventCustomFields = data.customFields || data.custom_fields || [];
        const fieldIdToLabel = new Map<string, string>();
        eventCustomFields.forEach((cf: any) => {
          fieldIdToLabel.set(cf.id, cf.label);
        });
        
        const customFieldsFromEvent = eventCustomFields.map((cf: any) => ({
          name: cf.id,
          label: cf.label
        }));
        
        try {
          const { data: participantsData } = await supabase
            .from('participants')
            .select('customData')
            .eq('eventId', eventId)
            .limit(10);
          
          const customFieldsFromParticipants: Array<{ name: string; label: string }> = [];
          const existingFieldNames = new Set([
            ...standardFields.map((f) => f.name),
            ...customFieldsFromEvent.map((f: { name: string; label: string }) => f.name)
          ]);
          
          if (participantsData) {
            participantsData.forEach((p: any) => {
              if (p.customData && typeof p.customData === 'object') {
                Object.keys(p.customData).forEach(key => {
                  if (!existingFieldNames.has(key)) {
                    let label = fieldIdToLabel.get(key);
                    if (!label) {
                      label = key.startsWith('fld-') ? 'Custom Field' : key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                    }
                    customFieldsFromParticipants.push({ name: key, label });
                    existingFieldNames.add(key);
                  }
                });
              }
            });
          }
          
          setAvailableFields([...standardFields, ...customFieldsFromEvent, ...customFieldsFromParticipants]);
        } catch (err) {
          console.error('Error loading custom fields from participants:', err);
          setAvailableFields([...standardFields, ...customFieldsFromEvent]);
        }

        if (data.badge_template) {
          // Load from Supabase badge_template
          const template = data.badge_template;
          setCurrentTemplateId('event');
          setCurrentTemplateName(template.name || 'Event Badge');
          
          setSettings({
            size: template.size || 'CR80',
            customWidth: template.customWidth || 100,
            customHeight: template.customHeight || 150,
            backgroundColor: template.backgroundColor || '#f3f4f6',
            backgroundImageUrl: template.backgroundImageUrl || '',
            backgroundImageFit: (template.backgroundImageFit || 'cover') as any,
            logoUrl: template.logoUrl || '',
            showQR: true,
            showAttendance: false,
            textColor: '#000000',
            accentColor: '#000000',
            components: []
          } as any);
          if (template.components) {
            setCanvasComponents(template.components.map((c: any) => normalizeComponent(c)));
          }
          if (template.printConfiguration) {
            setPrintConfiguration(template.printConfiguration);
          }
          // Set saved state ref to match loaded template (prevents false positive unsaved changes)
          lastSavedStateRef.current = JSON.stringify({
            components: template.components || [],
            backgroundImageUrl: template.backgroundImageUrl || '',
            logoUrl: template.logoUrl || '',
            backgroundColor: template.backgroundColor || '#f3f4f6'
          });
          console.log('[BadgeDesigner] Loaded badge template from Supabase:', template.name || 'Event Badge');
        } else {
          // No badge_template in database - use defaults
          console.log('[BadgeDesigner] No badge template found, using defaults');
          setSettings({
            size: 'CR80',
            customWidth: 100,
            customHeight: 150,
            backgroundColor: '#f3f4f6',
            backgroundImageUrl: '',
            backgroundImageFit: 'cover' as any,
            logoUrl: '',
            showQR: true,
            showAttendance: false,
            textColor: '#000000',
            accentColor: '#000000',
            components: []
          } as any);
          setCanvasComponents([]);
          setCurrentTemplateId(null);
          setCurrentTemplateName('');
          // Set saved state ref to match default state
          lastSavedStateRef.current = JSON.stringify({
            components: [],
            backgroundImageUrl: '',
            logoUrl: '',
            backgroundColor: '#f3f4f6'
          });
        }
      }
    } catch (error) {
      console.error('Error loading event from Supabase:', error);
    }
  }, [eventId]);

  // Load event data on mount or when eventId changes
  useEffect(() => {
    if (eventId) {
      // Load from Supabase only - loadEvent handles badge_template
      loadEvent();
    }
  }, [eventId, loadEvent]);


  const loadTemplates = async (autoLoadDefault: boolean = false) => {
    try {
      console.log('[BadgeDesigner] Loading templates from Supabase for event:', eventId);
      const templates = await loadBadgeTemplates(eventId);
      console.log('[BadgeDesigner] Loaded templates:', templates.length, templates.map(t => t.name));
      setSavedTemplates(templates);
      
      if (autoLoadDefault && templates.length > 0 && !currentTemplateId) {
        const defaultTemplate = templates.find(t => t.is_default) || templates[0];
        console.log('[BadgeDesigner] Auto-loading default template:', defaultTemplate.name);
        loadTemplateIntoDesigner(defaultTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadTemplateIntoDesigner = (template: BadgeTemplate) => {
    console.log('[BadgeDesigner] Loading template:', template.name, template.id);
    console.log('[BadgeDesigner] Template data:', template.template_data);
    
    const data = template.template_data;
    setCurrentTemplateId(template.id);
    setCurrentTemplateName(template.name);
    
    setSettings({
      size: data.size || 'CR80',
      customWidth: data.customWidth,
      customHeight: data.customHeight,
      backgroundColor: data.backgroundColor || '#f3f4f6',
      backgroundImageUrl: data.backgroundImageUrl || '',
      backgroundImageFit: (data.backgroundImageFit || 'cover') as any,
      logoUrl: data.logoUrl || '',
      showQR: true,
      showAttendance: false,
      textColor: '#000000',
      accentColor: '#000000',
      components: []
    } as any);
    
    if (data.components) {
      console.log('[BadgeDesigner] Loading components:', data.components.length);
      setCanvasComponents(data.components.map((c: any) => normalizeComponent(c)));
    } else {
      console.log('[BadgeDesigner] No components in template, clearing canvas');
      setCanvasComponents([]);
    }
    
    if (data.printConfiguration) {
      setPrintConfiguration(data.printConfiguration);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!settings || !newTemplateName.trim()) return;
    
    setIsSavingTemplate(true);
    const toastId = toast.loading('Saving template...');
    
    try {
      const templateData = {
        size: settings.size || 'CR80',
        customWidth: settings.customWidth,
        customHeight: settings.customHeight,
        backgroundColor: settings.backgroundColor,
        backgroundImageUrl: settings.backgroundImageUrl,
        backgroundImageFit: settings.backgroundImageFit,
        logoUrl: settings.logoUrl,
        components: canvasComponents,
        printConfiguration: printConfiguration
      };

      const result = await saveBadgeTemplate(eventId, newTemplateName.trim(), templateData, saveAsDefault);

      if (result.success && result.template) {
        setCurrentTemplateId(result.template.id);
        setCurrentTemplateName(result.template.name);
        await loadTemplates();
        setShowSaveTemplateDialog(false);
        setNewTemplateName('');
        setSaveAsDefault(false);
        toast.success(`Template "${result.template.name}" saved!`, { id: toastId });
      } else {
        toast.error('Failed to save template: ' + result.error, { id: toastId });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template', { id: toastId });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const _handleUpdateTemplate = async () => {
    if (!settings) return;
    
    let templateIdToUpdate = currentTemplateId;
    
    if (!templateIdToUpdate && currentTemplateName) {
      const matchingTemplate = savedTemplates.find(t => t.name === currentTemplateName);
      if (matchingTemplate) {
        templateIdToUpdate = matchingTemplate.id;
        setCurrentTemplateId(matchingTemplate.id);
      } else {
        alert('Template not found. Please use "Save As New" to create a new template.');
        return;
      }
    }
    
    if (!templateIdToUpdate) {
      alert('No template selected to update. Please load a template first or use "Save As New".');
      return;
    }
    
    setIsSaving(true);
    try {
      const templateData = {
        size: settings.size || 'CR80',
        customWidth: settings.customWidth,
        customHeight: settings.customHeight,
        backgroundColor: settings.backgroundColor,
        backgroundImageUrl: settings.backgroundImageUrl,
        backgroundImageFit: settings.backgroundImageFit,
        logoUrl: settings.logoUrl,
        components: canvasComponents,
        printConfiguration: printConfiguration
      };

      if (templateIdToUpdate === 'legacy') {
        const { error } = await supabase
          .from('events')
          .update({ badge_template: { ...templateData, name: currentTemplateName } })
          .eq('id', eventId);

        if (error) {
          alert('Failed to update template: ' + error.message);
        } else {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 1500);
        }
      } else {
        const result = await saveBadgeTemplate(eventId, currentTemplateName, templateData, false, templateIdToUpdate);

        if (result.success) {
          await loadTemplates();
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 1500);
        } else {
          alert('Failed to update template: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };
  void _handleUpdateTemplate;

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    const toastId = toast.loading('Deleting template...');
    try {
      const result = await deleteBadgeTemplate(templateId);
      if (result.success) {
        if (currentTemplateId === templateId) {
          setCurrentTemplateId(null);
          setCurrentTemplateName('');
        }
        await loadTemplates();
        toast.success('Template deleted', { id: toastId });
      } else {
        toast.error('Failed to delete template: ' + result.error, { id: toastId });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template', { id: toastId });
    }
  };

  // Reset canvas to blank state
  const handleNewDesign = () => {
    setCanvasComponents([]);
    setSelectedComponentId(null);
    setCurrentTemplateId(null);
    setCurrentTemplateName('');
    setSettings({
      ...settings!,
      backgroundColor: '#f3f4f6',
      backgroundImageUrl: '',
      logoUrl: ''
    });
    setHistory([]);
    setHistoryIndex(-1);
    // Update saved state ref to match new blank state
    lastSavedStateRef.current = JSON.stringify({
      components: [],
      backgroundImageUrl: '',
      logoUrl: '',
      backgroundColor: '#f3f4f6'
    });
    setHasUnsavedChanges(false);
    setShowNewDesignConfirm(false);
  };

  // Track unsaved changes by comparing to last saved state
  useEffect(() => {
    const currentState = JSON.stringify({
      components: canvasComponents,
      backgroundImageUrl: settings?.backgroundImageUrl,
      logoUrl: settings?.logoUrl,
      backgroundColor: settings?.backgroundColor
    });
    
    // Only mark as changed if we have a saved state to compare against
    // and the current state differs from it
    if (lastSavedStateRef.current && currentState !== lastSavedStateRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [canvasComponents, settings?.backgroundImageUrl, settings?.logoUrl, settings?.backgroundColor]);

  // System templates (mock data for now)
  const systemTemplates = [
    { id: 'sys-1', name: 'Conference Badge', description: 'Standard conference layout with QR code', preview: '🎫' },
    { id: 'sys-2', name: 'VIP Pass', description: 'Premium design with gold accents', preview: '⭐' },
    { id: 'sys-3', name: 'Staff Badge', description: 'Simple staff identification', preview: '👤' },
    { id: 'sys-4', name: 'Minimal', description: 'Clean minimal design', preview: '◻️' },
  ];

  // Load templates after a short delay to ensure loadEvent() has completed
  // and settings/currentTemplateId are initialized before auto-loading default template
  useEffect(() => {
    if (eventId) {
      const timer = setTimeout(() => {
        loadTemplates(true);
      }, 100);
      return () => clearTimeout(timer);
    }
    // Note: loadTemplates is intentionally excluded from deps to prevent re-fetching
    // on every render. We only want to load templates once when eventId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);


  const handleSave = async () => {
    if (!settings) return;
    if (isSaving) return; // Prevent double-clicks
    
    setIsSaving(true);
    const saveToastId = toast.loading('Saving badge design...');
    
    // Safety timeout - increased to 30 seconds for slow connections
    const safetyTimeout = setTimeout(() => {
      console.warn('[BadgeDesigner] Save timeout - resetting state');
      setIsSaving(false);
      toast.error('Save timed out. Please check your connection and try again.', { id: saveToastId });
    }, 30000);
    
    try {
      const badgeTemplate = {
        size: settings.size || 'CR80',
        customWidth: settings.customWidth || null,
        customHeight: settings.customHeight || null,
        backgroundColor: settings.backgroundColor || '#f3f4f6',
        backgroundImageUrl: settings.backgroundImageUrl || null,
        backgroundImageFit: settings.backgroundImageFit || 'cover',
        logoUrl: settings.logoUrl || null,
        components: canvasComponents || [],
        printConfiguration: printConfiguration || null
      };
      
      console.log('[BadgeDesigner] Saving badge template:', { eventId, badgeTemplate });
      
      const { data, error } = await supabase
        .from('events')
        .update({ badge_template: badgeTemplate })
        .eq('id', eventId)
        .select();
      
      clearTimeout(safetyTimeout);
      
      if (error) {
        console.error('[BadgeDesigner] Supabase error:', error);
        toast.error(`Failed to save: ${error.message}`, { id: saveToastId });
        throw new Error(`Failed to save badge template: ${error.message}`);
      }

      console.log('[BadgeDesigner] Save successful:', data);
      
      // Also update the template in badge_templates table if one is loaded
      let templateUpdated = false;
      if (currentTemplateId && currentTemplateId !== 'event' && currentTemplateId !== 'legacy') {
        console.log('[BadgeDesigner] Also updating template in badge_templates:', currentTemplateId);
        const { error: templateError } = await supabase
          .from('badge_templates')
          .update({
            template_data: badgeTemplate,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTemplateId);
        
        if (templateError) {
          console.warn('[BadgeDesigner] Failed to update template:', templateError);
        } else {
          console.log('[BadgeDesigner] Template updated successfully');
          templateUpdated = true;
          // Refresh templates list in background
          loadTemplates().catch(console.error);
        }
      }
      
      // Update saved state ref to current state
      lastSavedStateRef.current = JSON.stringify({
        components: canvasComponents,
        backgroundImageUrl: settings.backgroundImageUrl,
        logoUrl: settings.logoUrl,
        backgroundColor: settings.backgroundColor
      });
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      
      // Show success toast
      if (templateUpdated) {
        toast.success('Badge and template saved successfully!', { id: saveToastId });
      } else {
        toast.success('Badge design saved!', { id: saveToastId });
      }
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 1500);
    } catch (error) {
      clearTimeout(safetyTimeout);
      console.error('Error saving badge settings:', error);
      toast.error('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'), { id: saveToastId });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<BadgeSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
  };

  const handleTestPrint = async () => {
    if (!settings || !event) return;
    
    setIsPrinting(true);
    
    try {
      const sampleParticipant = {
        id: 'SAMPLE-001',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+62 812 3456 7890',
        company: 'Sample Company Inc.',
        position: 'Software Engineer',
        customData: {} as Record<string, string>
      };

      if (event.customFields) {
        event.customFields.forEach((field) => {
          sampleParticipant.customData[field.id] = `Sample ${field.label}`;
        });
      }

      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await QRCodeLib.toDataURL(sampleParticipant.id, {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
      } catch (err) {
        console.error('Error generating QR code:', err);
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to use the test print feature');
        setIsPrinting(false);
        return;
      }

      const selectedSize = BADGE_SIZES[settings.size || 'CR80'];
      const badgeWidth = settings.size === 'custom' ? settings.customWidth || 100 : selectedSize.width;
      const badgeHeight = settings.size === 'custom' ? settings.customHeight || 100 : selectedSize.height;

      let componentsHtml = '';
      for (const comp of canvasComponents) {
        if (!comp.enabled) continue;

        const style = `
          position: absolute;
          left: ${comp.x}%;
          top: ${comp.y}%;
          width: ${comp.width}%;
          height: ${comp.height}%;
          font-size: ${comp.fontSize || 16}px;
          font-family: ${comp.fontFamily || 'sans-serif'};
          font-weight: ${comp.fontWeight || 'normal'};
          font-style: ${comp.fontStyle || 'normal'};
          text-align: ${comp.textAlign || 'center'};
          color: ${comp.color || '#000000'};
          display: flex;
          align-items: center;
          justify-content: ${comp.textAlign === 'left' ? 'flex-start' : comp.textAlign === 'right' ? 'flex-end' : 'center'};
          overflow: hidden;
          ${comp.rotation ? `transform: rotate(${comp.rotation}deg); transform-origin: center;` : ''}
        `;

        let content = '';
        switch (comp.type) {
          case 'field':
            const fieldValue = comp.fieldName === 'name' ? sampleParticipant.name
              : comp.fieldName === 'email' ? sampleParticipant.email
              : comp.fieldName === 'phone' ? sampleParticipant.phone
              : comp.fieldName === 'company' ? sampleParticipant.company
              : comp.fieldName === 'position' ? sampleParticipant.position
              : sampleParticipant.customData[comp.fieldName || ''] || comp.label;
            content = `<span>${fieldValue}</span>`;
            break;
          case 'qrcode':
            content = qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" />` : '';
            break;
          case 'eventName':
            content = `<span>${event.name}</span>`;
            break;
          case 'customText':
            content = `<span>${comp.customText || comp.label}</span>`;
            break;
          case 'logo':
            if (settings.logoUrl) {
              content = `<img src="${settings.logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" />`;
            }
            break;
        }

        componentsHtml += `<div style="${style}">${content}</div>`;
      }

      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Print - Badge</title>
          <style>
            @page { size: ${badgeWidth}mm ${badgeHeight}mm; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { margin: 0; padding: 0; }
            .badge {
              width: ${badgeWidth}mm;
              height: ${badgeHeight}mm;
              position: relative;
              background-color: ${settings.backgroundColor || '#f3f4f6'};
              ${settings.backgroundImageUrl ? `background-image: url('${settings.backgroundImageUrl}'); background-size: ${settings.backgroundImageFit || 'cover'}; background-position: center;` : ''}
              overflow: hidden;
            }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="badge">${componentsHtml}</div>
          <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 500); };</script>
        </body>
        </html>
      `;

      printWindow.document.write(printHtml);
      printWindow.document.close();

    } catch (error) {
      console.error('Error during test print:', error);
      alert('Failed to generate test print: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsPrinting(false);
    }
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

    const xPercent = Math.max(0, Math.min(100 - componentWidth, (dropX / canvasWidth) * 100));
    const yPercent = Math.max(0, Math.min(100 - componentHeight, (dropY / canvasHeight) * 100));

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
    setCanvasComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const lastSaveRef = useRef<number>(0);
  const saveComponentsToHistory = (components: CanvasComponent[]) => {
    const now = Date.now();
    if (now - lastSaveRef.current > 500) {
      saveToHistory(components);
      lastSaveRef.current = now;
    }
  };

  const handlePaletteAdd = (componentType: string, fieldName?: string, label?: string) => {
    addComponentToCanvas(componentType, canvasWidth / 2, canvasHeight / 2, fieldName, label);
  };

  const clampZoom = (value: number) => Math.min(2, Math.max(0.25, value));

  const applyZoom = (value: number, disableAutoZoom = true) => {
    const clamped = parseFloat(clampZoom(value).toFixed(2));
    setZoomLevel(clamped);
    if (disableAutoZoom) setIsAutoZoom(false);
  };

  const incrementZoom = (delta: number) => applyZoom(zoomLevel + delta, true);

  const calculateAutoFitZoom = (containerWidth: number, containerHeight: number, canvasW: number, canvasH: number) => {
    const padding = 80;
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;
    const scaleX = availableWidth / canvasW;
    const scaleY = availableHeight / canvasH;
    const fitZoom = Math.min(scaleX, scaleY, 1.5);
    return Math.max(0.25, fitZoom);
  };

  const resetToAutoFit = () => setIsAutoZoom(true);

  const saveToHistory = (components: CanvasComponent[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...components]);
    if (newHistory.length > maxHistoryLength) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCanvasComponents([...history[historyIndex - 1]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCanvasComponents([...history[historyIndex + 1]]);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const requestDeleteComponent = (id: string) => {
    setComponentToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteComponent = () => {
    if (componentToDelete) {
      saveToHistory(canvasComponents);
      setCanvasComponents(prev => prev.filter(c => c.id !== componentToDelete));
      if (selectedComponentId === componentToDelete) setSelectedComponentId(null);
    }
    setDeleteConfirmOpen(false);
    setComponentToDelete(null);
  };

  const deleteComponent = (id: string) => requestDeleteComponent(id);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId) {
        e.preventDefault();
        requestDeleteComponent(selectedComponentId);
      }
      
      if (selectedComponentId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const component = canvasComponents.find(c => c.id === selectedComponentId);
        if (component) {
          const step = e.shiftKey ? 10 : 1;
          let newX = component.x;
          let newY = component.y;
          
          switch (e.key) {
            case 'ArrowUp': newY -= step; break;
            case 'ArrowDown': newY += step; break;
            case 'ArrowLeft': newX -= step; break;
            case 'ArrowRight': newX += step; break;
          }
          
          updateComponent(selectedComponentId, { x: newX, y: newY });
        }
      }
      
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) { e.preventDefault(); redo(); }
      if (e.key === 'Escape') setSelectedComponentId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, historyIndex, history, canvasComponents]);

  useEffect(() => {
    if (canvasComponents.length > 0) {
      if (history.length === 0) {
        saveToHistory(canvasComponents);
      } else {
        saveComponentsToHistory(canvasComponents);
      }
    }
  }, [JSON.stringify(canvasComponents)]);

  useEffect(() => {
    if (!isAutoZoom || !previewContainerRef.current || !settings) return;
    
    const container = previewContainerRef.current;
    const updateAutoZoom = () => {
      const rect = container.getBoundingClientRect();
      const selectedSize = BADGE_SIZES[settings.size || 'CR80'];
      const w = settings.size === 'custom' ? settings.customWidth || 100 : selectedSize.width;
      const h = settings.size === 'custom' ? settings.customHeight || 100 : selectedSize.height;
      const canvasW = w * CANVAS_SCALE;
      const canvasH = h * CANVAS_SCALE;
      
      const newZoom = calculateAutoFitZoom(rect.width, rect.height, canvasW, canvasH);
      setZoomLevel(parseFloat(newZoom.toFixed(2)));
    };
    
    updateAutoZoom();
    const resizeObserver = new ResizeObserver(updateAutoZoom);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [isAutoZoom, settings?.size, settings?.customWidth, settings?.customHeight]);

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG or JPG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setIsUploadingBg(true);
    try {
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
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Badge Designer...</p>
        </div>
      </div>
    );
  }

  const selectedSize = BADGE_SIZES[settings.size || 'CR80'];
  const width = settings.size === 'custom' ? settings.customWidth || 100 : selectedSize.width;
  const height = settings.size === 'custom' ? settings.customHeight || 100 : selectedSize.height;
  const canvasWidth = width * CANVAS_SCALE;
  const canvasHeight = height * CANVAS_SCALE;
  const selectedComponent = canvasComponents.find(c => c.id === selectedComponentId);

  const customFields = availableFields.filter(f => !['name', 'email', 'phone', 'company', 'position'].includes(f.name));


  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* TOP TOOLBAR */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0 shadow-sm">


        {/* Template Name Display - Document Title Pattern */}
        <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
          <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => {
            if (currentTemplateName) {
              setNewTemplateName(currentTemplateName);
            } else {
              setNewTemplateName('');
            }
            setShowSaveTemplateDialog(true);
          }}>
            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
            <span 
              className={`text-sm truncate ${
                currentTemplateName 
                  ? 'font-medium text-gray-900' 
                  : 'italic text-gray-400'
              }`}
              title={currentTemplateName || 'Untitled Design'}
            >
              {currentTemplateName || 'Untitled Design'}
            </span>
            <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 mx-2" />

        {/* Badge Size Dropdown */}
        <div className="flex items-center gap-2">
          <Select
            value={settings.size || 'CR80'}
            onValueChange={(value: string) => updateSettings({ size: value as any })}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Badge Size" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto z-50">
              <SelectGroup>
                <SelectLabel className="text-[10px]">ID Card Sizes</SelectLabel>
                {['CR80', 'B1', 'B2', 'B3', 'B4', 'A1', 'A2', 'A3'].map((key) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {BADGE_SIZES[key as keyof typeof BADGE_SIZES].label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-[10px]">Paper</SelectLabel>
                {['A6', 'A7'].map((key) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {BADGE_SIZES[key as keyof typeof BADGE_SIZES].label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectItem value="custom" className="text-xs">Custom Size</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Size Inputs - Show when custom is selected */}
          {settings.size === 'custom' && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={settings.customWidth || 100}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    updateSettings({ customWidth: val });
                  }
                }}
                className="h-9 w-16 text-xs text-center"
                min={10}
                max={500}
                placeholder="W"
              />
              <span className="text-xs text-gray-400">×</span>
              <Input
                type="number"
                value={settings.customHeight || 150}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    updateSettings({ customHeight: val });
                  }
                }}
                className="h-9 w-16 text-xs text-center"
                min={10}
                max={500}
                placeholder="H"
              />
              <span className="text-xs text-gray-400">mm</span>
            </div>
          )}

          {/* Orientation Toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => {
                if (width > height) {
                  if (settings.size === 'custom') {
                    updateSettings({ customWidth: settings.customHeight, customHeight: settings.customWidth });
                  } else {
                    const s = BADGE_SIZES[settings.size as keyof typeof BADGE_SIZES];
                    updateSettings({ size: 'custom' as any, customWidth: Math.min(s.width, s.height), customHeight: Math.max(s.width, s.height) });
                  }
                }
              }}
              className={`px-2 py-1.5 text-xs ${height >= width ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Portrait"
            >
              <svg className="w-3 h-4" viewBox="0 0 12 16" fill="currentColor" opacity={0.5}><rect x="1" y="1" width="10" height="14" rx="1" /></svg>
            </button>
            <button
              onClick={() => {
                if (height > width) {
                  if (settings.size === 'custom') {
                    updateSettings({ customWidth: settings.customHeight, customHeight: settings.customWidth });
                  } else {
                    const s = BADGE_SIZES[settings.size as keyof typeof BADGE_SIZES];
                    updateSettings({ size: 'custom' as any, customWidth: Math.max(s.width, s.height), customHeight: Math.min(s.width, s.height) });
                  }
                }
              }}
              className={`px-2 py-1.5 text-xs ${width > height ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Landscape"
            >
              <svg className="w-4 h-3" viewBox="0 0 16 12" fill="currentColor" opacity={0.5}><rect x="1" y="1" width="14" height="10" rx="1" /></svg>
            </button>
          </div>

          <span className="text-xs text-gray-500 hidden md:inline">
            {width.toFixed(1)} × {height.toFixed(1)}mm
          </span>
        </div>

        <div className="h-6 w-px bg-gray-200 mx-2" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} className="h-9 w-9 p-0">
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} className="h-9 w-9 p-0">
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="h-6 w-px bg-gray-200 mx-2" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => incrementZoom(-0.1)} className="h-8 w-8 p-0">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => incrementZoom(0.1)} className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant={isAutoZoom ? 'secondary' : 'ghost'}
            size="sm"
            onClick={resetToAutoFit}
            className="h-8 px-2 text-xs"
          >
            Fit
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Templates Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplatesModal(true)}
            className="h-9 px-3 text-xs"
          >
            <LayoutTemplate className="h-4 w-4 mr-1.5" />
            Templates
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="h-9 px-3 text-xs"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>

          {/* Split Save Button */}
          <div className="flex items-center">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="h-9 px-4 gradient-primary text-white text-xs rounded-r-none border-r border-white/20"
            >
              {isSaving ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1.5" />Saving...</>
              ) : saveSuccess ? (
                <><CheckCircle2 className="h-4 w-4 mr-1.5" />Saved!</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" />Save</>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 px-2 gradient-primary text-white text-xs rounded-l-none"
                  disabled={isSaving}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  setNewTemplateName('');
                  setSaveAsDefault(false);
                  setShowSaveTemplateDialog(true);
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Save as Template...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>


      {/* MAIN CONTENT: Left Sidebar + Canvas + Right Panel */}
      <div className="flex-1 grid grid-cols-[240px_1fr_280px] overflow-hidden">
        {/* LEFT SIDEBAR - Tools & Elements */}
        <aside className="bg-slate-50 border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-700">Tools</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Elements Section */}
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Elements
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePaletteAdd('eventName', undefined, 'Event Name')}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all text-left"
                >
                  <Calendar className="h-4 w-4 text-primary-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Event</span>
                </button>
                <button
                  onClick={() => handlePaletteAdd('qrcode', undefined, 'QR Code')}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all text-left"
                >
                  <QrCode className="h-4 w-4 text-primary-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">QR Code</span>
                </button>
                <button
                  onClick={() => handlePaletteAdd('logo', undefined, 'Logo')}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all text-left"
                >
                  <ImageIcon className="h-4 w-4 text-primary-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Logo</span>
                </button>
                <button
                  onClick={() => handlePaletteAdd('customText', undefined, 'Custom Text')}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all text-left"
                >
                  <Type className="h-4 w-4 text-primary-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Text</span>
                </button>
              </div>
            </div>

            {/* Standard Fields Section */}
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Participant Fields
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => handlePaletteAdd('field', 'name', 'Name')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <User className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Name</span>
                </button>
                <button
                  onClick={() => handlePaletteAdd('field', 'email', 'Email')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Email</span>
                </button>
                <button
                  onClick={() => handlePaletteAdd('field', 'company', 'Company')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <Building className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Company</span>
                </button>
                <button
                  onClick={() => handlePaletteAdd('field', 'position', 'Position')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <Briefcase className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Position</span>
                </button>
                <button
                  onClick={() => handlePaletteAdd('field', 'phone', 'Phone')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">Phone</span>
                </button>
              </div>
            </div>

            {/* Custom Fields Section */}
            {customFields.length > 0 && (
              <Collapsible open={fieldsExpanded} onOpenChange={setFieldsExpanded}>
                <CollapsibleTrigger className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1 hover:text-gray-700">
                  <span>Custom Fields ({customFields.length})</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${fieldsExpanded ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5">
                  {customFields.map((field) => (
                    <button
                      key={field.name}
                      onClick={() => handlePaletteAdd('field', field.name, field.label)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left"
                    >
                      <Type className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-xs font-medium text-gray-700 truncate">{field.label}</span>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </aside>


        {/* CENTER CANVAS AREA - Infinite canvas style */}
        <main 
          ref={previewContainerRef}
          className="relative overflow-auto bg-[#1e1e1e] flex items-center justify-center select-none"
          onMouseDown={(e) => {
            // Only deselect if clicking directly on the main background (not bubbled from children)
            if (e.target === e.currentTarget) {
              setSelectedComponentId(null);
            }
          }}
          style={{
            backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Canvas container with shadow */}
          <div
            className="relative transform transition-transform duration-200 ease-out shadow-2xl"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
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
              onComponentResize={(id, w, h) => updateComponent(id, { width: w, height: h })}
              event={event}
              zoomLevel={zoomLevel}
            />
          </div>
          
          {/* Canvas info bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            {width.toFixed(1)} × {height.toFixed(1)} mm
          </div>
        </main>

        {/* RIGHT PROPERTIES PANEL */}
        <aside className="bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Properties</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedComponent ? (
              <ComponentStylingPanel
                component={selectedComponent}
                onUpdate={(updates) => updateComponent(selectedComponent.id, updates)}
                onDelete={() => deleteComponent(selectedComponent.id)}
                logoUrl={settings.logoUrl}
                onLogoUrlChange={(url) => updateSettings({ logoUrl: url })}
                badgeWidthMm={width}
                badgeHeightMm={height}
              />
            ) : (
              <div className="h-full flex flex-col">
                {/* Empty State */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <MousePointer2 className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Select a component</p>
                    <p className="text-xs text-gray-400 mt-1">Click any element on the canvas to edit</p>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 font-medium mb-2">Shortcuts</p>
                      <div className="space-y-1 text-[10px] text-gray-500">
                        <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[9px]">Del</kbd> Remove</div>
                        <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[9px]">Ctrl+Z</kbd> Undo</div>
                        <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[9px]">Arrows</kbd> Move</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Background Section - Always visible */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-3">
                      <span>Background</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={settings.backgroundColor || '#f3f4f6'}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            className="w-10 h-9 p-1 rounded border"
                          />
                          <Input
                            type="text"
                            value={settings.backgroundColor || '#f3f4f6'}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            className="flex-1 h-9 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Image</Label>
                        <div className="mt-1">
                          <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {isUploadingBg ? 'Uploading...' : settings.backgroundImageUrl ? 'Change Image' : 'Upload Image'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBackgroundImageUpload}
                              className="hidden"
                              disabled={isUploadingBg}
                            />
                          </label>
                          {settings.backgroundImageUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSettings({ backgroundImageUrl: '' })}
                              className="w-full mt-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              Remove Image
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>


      {/* EXPORT MODAL - Responsive Flex Column Layout */}
      {/* modal={false} allows Select dropdowns to work inside the dialog */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal} modal={false}>
        <DialogContent 
          className="w-full max-w-4xl flex flex-col overflow-hidden"
          style={{ maxHeight: '90vh' }}
        >
          {/* Fixed Header - Never shrinks */}
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Export & Print Settings</DialogTitle>
            <DialogDescription>Configure paper size, margins, and preview before printing</DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Body - Takes remaining space, scrolls when needed */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-4">
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
              {/* Print Settings */}
              <div className="pr-2">
                <BadgePrintSettings
                  configuration={printConfiguration}
                  badgeWidth={width}
                  badgeHeight={height}
                  onConfigurationChange={setPrintConfiguration}
                />
              </div>
              
              {/* Preview */}
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="bg-white shadow-lg rounded-lg p-8 inline-block">
                    <div 
                      className="border-2 border-dashed border-primary-300 relative"
                      style={{
                        width: `${Math.min(300, width * 2)}px`,
                        height: `${Math.min(200, height * 2)}px`,
                        backgroundColor: settings.backgroundColor
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                        Badge Preview
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Badge: {width.toFixed(1)}mm × {height.toFixed(1)}mm
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer - Never shrinks */}
          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestPrint}
              disabled={isPrinting}
              className="gradient-primary text-white"
            >
              {isPrinting ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Printing...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" />Print Badge</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Component?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can be undone with Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteComponent} 
              className="!bg-red-600 !text-white hover:!bg-red-700 focus:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SAVE TEMPLATE DIALOG */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save as New Template</DialogTitle>
            <DialogDescription>Give your badge template a name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name" className="text-sm">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Conference Badge"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={saveAsDefault} onCheckedChange={setSaveAsDefault} />
              <Label className="text-sm text-gray-600">Set as default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={!newTemplateName.trim() || isSavingTemplate}
              className="gradient-primary text-white"
            >
              {isSavingTemplate ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TEMPLATES GALLERY MODAL */}
      <Dialog open={showTemplatesModal} onOpenChange={setShowTemplatesModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Badge Templates
            </DialogTitle>
            <DialogDescription>Choose a template to start with or load a saved design</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="my-templates" className="flex-1 flex flex-col min-h-0 mt-4">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="my-templates">My Templates</TabsTrigger>
              <TabsTrigger value="system-templates">System Templates</TabsTrigger>
            </TabsList>
            
            {/* My Templates Tab */}
            <TabsContent value="my-templates" className="flex-1 overflow-y-auto mt-4">
              {savedTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <FolderOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No saved templates yet</p>
                  <p className="text-xs text-gray-400 mt-1">Save your current design as a template to reuse it later</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setShowTemplatesModal(false);
                      setNewTemplateName('');
                      setSaveAsDefault(false);
                      setShowSaveTemplateDialog(true);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Save Current as Template
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="group relative border rounded-lg p-4 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer bg-white"
                      onClick={() => {
                        loadTemplateIntoDesigner(template);
                        setShowTemplatesModal(false);
                        // Update saved state ref to match loaded template
                        lastSavedStateRef.current = JSON.stringify({
                          components: template.template_data.components || [],
                          backgroundImageUrl: template.template_data.backgroundImageUrl || '',
                          logoUrl: template.template_data.logoUrl || '',
                          backgroundColor: template.template_data.backgroundColor || '#f3f4f6'
                        });
                        setHasUnsavedChanges(false);
                      }}
                    >
                      {/* Template Preview */}
                      <div 
                        className="aspect-[4/3] rounded-md mb-3 flex items-center justify-center border"
                        style={{ backgroundColor: template.template_data.backgroundColor || '#f3f4f6' }}
                      >
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      
                      {/* Template Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate flex-1">{template.name}</h4>
                          {template.is_default && (
                            <span className="text-[9px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {template.template_data.size || 'CR80'} • {template.template_data.components?.length || 0} elements
                        </p>
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* System Templates Tab */}
            <TabsContent value="system-templates" className="flex-1 overflow-y-auto mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {systemTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer bg-white"
                    onClick={() => {
                      // For now, just show a message - system templates would load predefined layouts
                      alert(`System template "${template.name}" would be loaded here. This feature is coming soon!`);
                    }}
                  >
                    {/* Template Preview */}
                    <div className="aspect-[4/3] rounded-md mb-3 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 border text-3xl">
                      {template.preview}
                    </div>
                    
                    {/* Template Info */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                      <p className="text-[10px] text-gray-500">{template.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTemplatesModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW DESIGN CONFIRMATION */}
      <AlertDialog open={showNewDesignConfirm} onOpenChange={setShowNewDesignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Design?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Starting a new design will clear the current canvas. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleNewDesign}
              className="!bg-primary-600 !text-white hover:!bg-primary-700"
            >
              Start New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// Badge Canvas Component
interface BadgeCanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundImageFit?: 'cover' | 'contain';
  components: CanvasComponent[];
  selectedComponentId: string | null;
  onComponentSelect: (id: string | null) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentResize: (id: string, width: number, height: number) => void;
  event: Event;
  zoomLevel: number; // Added for coordinate compensation
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
  event,
  zoomLevel
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
    backgroundSize: '10px 10px',
    backgroundImage:
      'linear-gradient(to right, rgba(124, 58, 237, 0.15) 1px, transparent 1px), ' +
      'linear-gradient(to bottom, rgba(124, 58, 237, 0.15) 1px, transparent 1px)',
    opacity: 0.5
  };

  const centerX = width / 2;
  const centerY = height / 2;

  return (
    <div
      ref={canvasRef}
      data-badge-canvas="true"
      className="relative border-2 border-gray-300 shadow-2xl rounded-lg overflow-hidden bg-white cursor-default"
      style={backgroundStyle}
      onMouseDown={(e) => {
        // Only deselect if clicking directly on the canvas background, not on a component
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onComponentSelect(null);
        }
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={gridOverlayStyle} />

      {/* Center guides */}
      <div className="absolute pointer-events-none" style={{ left: 0, top: `${(centerY / height) * 100}%`, width: '100%', height: '1px', borderTop: '1px dashed rgba(124, 58, 237, 0.3)' }} />
      <div className="absolute pointer-events-none" style={{ left: `${(centerX / width) * 100}%`, top: 0, width: '1px', height: '100%', borderLeft: '1px dashed rgba(124, 58, 237, 0.3)' }} />

      {components.map(component => {
        const isTextComponent = ['field', 'eventName', 'customText'].includes(component.type);
        
        if (isTextComponent) {
          let displayText = '';
          if (component.type === 'eventName') {
            displayText = (component.customText && component.customText.trim().length > 0) ? component.customText : event.name;
          } else if (component.type === 'field') {
            displayText = `Sample ${component.label}`;
          } else if (component.type === 'customText') {
            displayText = component.customText || 'Custom Text';
          }

          return (
            <ResizableTextComponent
              key={component.id}
              id={component.id}
              x={component.x}
              y={component.y}
              width={component.width}
              height={component.height}
              text={displayText}
              baseFontSize={component.fontSize || 16}
              color={component.color || '#000000'}
              fontFamily={component.fontFamily || 'sans-serif'}
              fontWeight={component.fontWeight || 'normal'}
              textAlign={component.textAlign as 'left' | 'center' | 'right' || 'left'}
              rotation={component.rotation}
              isSelected={selectedComponentId === component.id}
              onSelect={() => onComponentSelect(component.id)}
              onMove={(x, y) => onComponentMove(component.id, x, y)}
              onResize={(w, h) => onComponentResize(component.id, w, h)}
              containerRef={canvasRef}
            />
          );
        }

        return (
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
            zoomLevel={zoomLevel}
          />
        );
      })}

      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <Plus className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Click tools on the left to add elements</p>
          </div>
        </div>
      )}
    </div>
  );
}


// Canvas Component Item (for non-text components like QR, Logo)
// Uses custom rotation-aware drag and resize logic (no re-resizable library)
interface CanvasComponentItemProps {
  component: CanvasComponent;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  event: Event;
  zoomLevel: number;
}

function CanvasComponentItem({
  component,
  isSelected,
  canvasWidth,
  canvasHeight,
  onSelect,
  onMove,
  onResize,
  event,
  zoomLevel: _zoomLevel
}: CanvasComponentItemProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  
  // Store initial values when drag/resize starts
  const initialState = useRef({
    mouseX: 0,
    mouseY: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (component.type === 'qrcode') {
      QRCodeLib.toDataURL('SAMPLE-QR-CODE', { width: 200, margin: 1 }).then(setQrCodeUrl);
    }
  }, [component.type]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    
    initialState.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height,
    };
    setIsDragging(true);
  };

  const handleHandleMouseDown = (e: React.MouseEvent, handle: HandlePosition) => {
    e.stopPropagation();
    e.preventDefault();
    
    initialState.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height,
    };
    setActiveHandle(handle);
    setIsResizing(true);
  };

  // Get container rect for coordinate conversion
  const getContainerRect = useCallback(() => {
    // Find the canvas element
    const canvas = componentRef.current?.closest('[data-badge-canvas]');
    if (!canvas) return { width: canvasWidth, height: canvasHeight, left: 0, top: 0 };
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, top: rect.top };
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = getContainerRect();
      const rotation = component.rotation || 0;

      if (isDragging) {
        // Convert screen-space mouse delta to percentage
        const screenDeltaX = ((e.clientX - initialState.current.mouseX) / rect.width) * 100;
        const screenDeltaY = ((e.clientY - initialState.current.mouseY) / rect.height) * 100;
        
        const proposedX = initialState.current.x + screenDeltaX;
        const proposedY = initialState.current.y + screenDeltaY;
        
        // Convert to center for AABB constraint
        const proposedCenterX = proposedX + component.width / 2;
        const proposedCenterY = proposedY + component.height / 2;
        
        const constrained = constrainRotatedToCanvas(
          proposedCenterX,
          proposedCenterY,
          component.width,
          component.height,
          rotation
        );
        
        const newX = constrained.x - component.width / 2;
        const newY = constrained.y - component.height / 2;
        
        onMove(component.id, newX, newY);
      }

      if (isResizing && activeHandle) {
        // Convert mouse position to percentage
        const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // Current element center
        const currentCenterX = initialState.current.x + initialState.current.width / 2;
        const currentCenterY = initialState.current.y + initialState.current.height / 2;

        // Use anchor-based resize calculation
        const result = calculateAnchorBasedResize(
          mouseXPercent,
          mouseYPercent,
          currentCenterX,
          currentCenterY,
          initialState.current.width,
          initialState.current.height,
          rotation,
          activeHandle,
          MIN_WIDTH_PERCENT,
          MIN_HEIGHT_PERCENT
        );

        // Constrain using AABB
        const constrained = constrainRotatedToCanvas(
          result.newCenterX,
          result.newCenterY,
          result.newWidth,
          result.newHeight,
          rotation
        );
        
        // Convert center back to top-left position
        const newX = constrained.x - result.newWidth / 2;
        const newY = constrained.y - result.newHeight / 2;

        onMove(component.id, newX, newY);
        onResize(component.id, result.newWidth, result.newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, activeHandle, component.id, component.width, component.height, component.rotation, onMove, onResize, getContainerRect]);

  const renderContent = () => {
    if (component.type === 'qrcode' && qrCodeUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
        </div>
      );
    }

    if (component.type === 'logo' && event.branding?.logoUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <img src={event.branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      );
    }

    return null;
  };

  const rotation = component.rotation || 0;

  // Handle positions relative to element
  const handles: { position: HandlePosition; style: React.CSSProperties }[] = [
    { position: 'nw', style: { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 } },
    { position: 'n', style: { top: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)' } },
    { position: 'ne', style: { top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 } },
    { position: 'e', style: { top: '50%', right: -HANDLE_SIZE/2, transform: 'translateY(-50%)' } },
    { position: 'se', style: { bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 } },
    { position: 's', style: { bottom: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)' } },
    { position: 'sw', style: { bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 } },
    { position: 'w', style: { top: '50%', left: -HANDLE_SIZE/2, transform: 'translateY(-50%)' } },
  ];

  return (
    <div
      ref={componentRef}
      data-component-id={component.id}
      className="absolute select-none"
      style={{
        left: `${component.x}%`,
        top: `${component.y}%`,
        width: `${component.width}%`,
        height: `${component.height}%`,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center',
        zIndex: isSelected ? 50 : undefined,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMouseDown(e);
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Content */}
      <div className="w-full h-full pointer-events-none">
        {renderContent()}
      </div>

      {/* Selection Border */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-primary-500 rounded pointer-events-none" />
      )}

      {/* Label */}
      {isSelected && (
        <div className="absolute -top-6 left-0 bg-primary-600 text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap pointer-events-none shadow">
          {component.label || component.type}
        </div>
      )}

      {/* Resize Handles - cursor dynamically calculated based on rotation */}
      {isSelected && handles.map(({ position, style }) => (
        <div
          key={position}
          data-handle={position}
          className="absolute bg-white border border-black z-50"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: getCursorForHandle(position, rotation),
            ...style,
          }}
          onMouseDown={(e) => handleHandleMouseDown(e, position)}
        />
      ))}
    </div>
  );
}


// Component Styling Panel
interface ComponentStylingPanelProps {
  component: CanvasComponent;
  onUpdate: (updates: Partial<CanvasComponent>) => void;
  onDelete: () => void;
  logoUrl?: string;
  onLogoUrlChange: (url: string) => void;
  badgeWidthMm: number;
  badgeHeightMm: number;
}

function ComponentStylingPanel({
  component,
  onUpdate,
  onDelete,
  logoUrl,
  onLogoUrlChange,
  badgeWidthMm,
  badgeHeightMm
}: ComponentStylingPanelProps) {
  const isTextComponent = ['field', 'eventName', 'customText'].includes(component.type);

  const toMm = (percent: number, totalMm: number) => (percent / 100) * totalMm;
  const toPercent = (mm: number, totalMm: number) => (mm / totalMm) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Editing</p>
          <p className="text-sm font-semibold text-gray-800">{component.label || component.type}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Delete (Del key)</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Text Settings */}
      {isTextComponent && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2">
            <span>Text & Style</span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">
            {(component.type === 'customText' || component.type === 'eventName') && (
              <div>
                <Label className="text-xs text-gray-500">Text Content</Label>
                <Input
                  value={component.customText || ''}
                  onChange={(e) => onUpdate({ customText: e.target.value })}
                  placeholder={component.type === 'eventName' ? 'Leave blank for event name' : 'Enter text'}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">Font Size</Label>
                <Input
                  type="number"
                  value={component.fontSize || 16}
                  onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                  min={8} max={72}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Font</Label>
                <Select value={component.fontFamily || 'sans-serif'} onValueChange={(v) => onUpdate({ fontFamily: v })}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sans-serif">Sans Serif</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="monospace">Monospace</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Style</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={component.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ fontWeight: component.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className="flex-1 h-9"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant={component.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ fontStyle: component.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  className="flex-1 h-9"
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Alignment</Label>
              <div className="flex gap-2 mt-1">
                <Button variant={component.textAlign === 'left' ? 'default' : 'outline'} size="sm" onClick={() => onUpdate({ textAlign: 'left' })} className="flex-1 h-9">
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant={component.textAlign === 'center' ? 'default' : 'outline'} size="sm" onClick={() => onUpdate({ textAlign: 'center' })} className="flex-1 h-9">
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant={component.textAlign === 'right' ? 'default' : 'outline'} size="sm" onClick={() => onUpdate({ textAlign: 'right' })} className="flex-1 h-9">
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Color</Label>
              <div className="flex gap-2 mt-1">
                <Input type="color" value={component.color || '#000000'} onChange={(e) => onUpdate({ color: e.target.value })} className="w-10 h-9 p-1" />
                <Input type="text" value={component.color || '#000000'} onChange={(e) => onUpdate({ color: e.target.value })} className="flex-1 h-9 text-sm" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}


      {/* Position & Size */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2">
          <span>Position & Size</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">X (mm)</Label>
              <Input
                type="number"
                value={toMm(component.x, badgeWidthMm).toFixed(1)}
                onChange={(e) => onUpdate({ x: toPercent(parseFloat(e.target.value), badgeWidthMm) })}
                min={0} max={badgeWidthMm} step={0.5}
                className="mt-1 h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Y (mm)</Label>
              <Input
                type="number"
                value={toMm(component.y, badgeHeightMm).toFixed(1)}
                onChange={(e) => onUpdate({ y: toPercent(parseFloat(e.target.value), badgeHeightMm) })}
                min={0} max={badgeHeightMm} step={0.5}
                className="mt-1 h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">Width (mm)</Label>
              <Input
                type="number"
                value={toMm(component.width, badgeWidthMm).toFixed(1)}
                onChange={(e) => onUpdate({ width: toPercent(parseFloat(e.target.value), badgeWidthMm) })}
                min={1} step={0.5}
                className="mt-1 h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Height (mm)</Label>
              <Input
                type="number"
                value={toMm(component.height, badgeHeightMm).toFixed(1)}
                onChange={(e) => onUpdate({ height: toPercent(parseFloat(e.target.value), badgeHeightMm) })}
                min={1} step={0.5}
                className="mt-1 h-9 text-sm"
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <Label className="text-xs text-gray-500 flex items-center gap-1">
              <RotateCw className="h-3 w-3" /> Rotation
            </Label>
            <div className="flex gap-1 mt-1">
              {[0, 90, 180, 270].map((angle) => (
                <Button
                  key={angle}
                  variant={(component.rotation || 0) === angle ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ rotation: angle })}
                  className="flex-1 h-8 text-xs"
                >
                  {angle}°
                </Button>
              ))}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Switch checked={component.enabled} onCheckedChange={(checked) => onUpdate({ enabled: checked as boolean })} />
            <Label className="text-xs text-gray-600">Show on badge</Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Logo Options */}
      {component.type === 'logo' && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2">
            <span>Logo Settings</span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            <div>
              <Label className="text-xs text-gray-500">Logo URL</Label>
              <Input
                type="url"
                value={logoUrl || ''}
                onChange={(e) => onLogoUrlChange(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="mt-1 h-9 text-sm"
              />
            </div>
            <p className="text-[10px] text-gray-400">Or set in Event Branding settings</p>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
