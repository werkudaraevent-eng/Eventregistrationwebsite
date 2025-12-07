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
// RadioGroup removed - using Select dropdown instead
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { 
  Save, QrCode, Image as ImageIcon, Type, CheckCircle2, 
  Plus, Trash2, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Upload, Minus, Undo2, Redo2, MousePointer2, FileText, Printer, CreditCard
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import QRCodeLib from 'qrcode';
import localDB from '../utils/localDBStub';
import { supabase } from '../utils/supabase/client';
import type { BadgeSettings, Event, PaperSizeConfiguration } from '../utils/localDBStub';
import { DEFAULT_PRINT_CONFIG, PAPER_SIZES as PRINT_PAPER_SIZES } from '../utils/localDBStub';
import { BadgePrintSettings } from './BadgePrintSettings';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { saveBadgeTemplate, loadBadgeTemplates, deleteBadgeTemplate, type BadgeTemplate } from './BadgeTemplateSelector';

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
// Standard ID Card sizes based on Indonesian market (Ukuran Dalam / Inner Size)
const BADGE_SIZES = {
  CR80: { width: 85.6, height: 53.98, label: 'CR80 (Credit Card)' },
  // Indonesian ID Card Holder Sizes (B Series - Landscape)
  B1: { width: 85, height: 55, label: 'B1 (85x55mm)' },
  B2: { width: 105, height: 65, label: 'B2 (105x65mm)' },
  B3: { width: 105, height: 80, label: 'B3 (105x80mm)' },
  B4: { width: 130, height: 90, label: 'B4 (130x90mm)' },
  // Indonesian ID Card Holder Sizes (A Series - Portrait)
  A1: { width: 55, height: 90, label: 'A1 (55x90mm)' },
  A2: { width: 65, height: 95, label: 'A2 (65x95mm)' },
  A3: { width: 80, height: 100, label: 'A3 (80x100mm)' },
  // Paper sizes
  A6: { width: 105, height: 148, label: 'A6 Paper' },
  A7: { width: 74, height: 105, label: 'A7 Paper' },
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
  const [isAutoZoom, setIsAutoZoom] = useState(true);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printConfiguration, setPrintConfiguration] = useState<PaperSizeConfiguration>(DEFAULT_PRINT_CONFIG);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // Template management
  const [savedTemplates, setSavedTemplates] = useState<BadgeTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [currentTemplateName, setCurrentTemplateName] = useState<string>('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  
  // Undo/Redo history
  const [history, setHistory] = useState<CanvasComponent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50;

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
    
    // Load print configuration if exists
    if (storedSettings.printConfiguration) {
      setPrintConfiguration(storedSettings.printConfiguration);
    }
    
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

  const loadEvent = async () => {
    try {
      // Handle both old format (E...) and new format (evt-...)
      let query = supabase
        .from('events')
        .select('*')
        .eq('id', eventId);

      const { data, error } = await query.single();

      if (error) {
        // If event not found, try searching in other fields as fallback
        console.warn('Event not found by ID, searching by legacy ID...');
        
        // For now, just log the error
        console.error('Error loading event:', error);
        return;
      }

      if (data) {
        // Convert database format to component format
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
        
        // Load custom fields from event definition (try both camelCase and snake_case)
        // Create a map of field ID to label for quick lookup
        const eventCustomFields = data.customFields || data.custom_fields || [];
        const fieldIdToLabel = new Map<string, string>();
        eventCustomFields.forEach((cf: any) => {
          fieldIdToLabel.set(cf.id, cf.label);
        });
        
        const customFieldsFromEvent = eventCustomFields.map((cf: any) => ({
          name: cf.id,
          label: cf.label
        }));
        
        // Also check participants' customData for any fields that might have data
        // but use the label from event definition
        try {
          const { data: participantsData } = await supabase
            .from('participants')
            .select('customData')
            .eq('eventId', eventId)
            .limit(10);
          
          const customFieldsFromParticipants: Array<{ name: string; label: string }> = [];
          const existingFieldNames = new Set([
            ...standardFields.map((f: { name: string; label: string }) => f.name),
            ...customFieldsFromEvent.map((f: { name: string; label: string }) => f.name)
          ]);
          
          if (participantsData) {
            participantsData.forEach((p: any) => {
              if (p.customData && typeof p.customData === 'object') {
                Object.keys(p.customData).forEach(key => {
                  if (!existingFieldNames.has(key)) {
                    // Try to get label from event custom fields definition
                    // If not found, create a readable label from the key
                    let label = fieldIdToLabel.get(key);
                    if (!label) {
                      // If key looks like an ID (fld-xxx), try to make it readable
                      if (key.startsWith('fld-')) {
                        label = 'Custom Field'; // Fallback for unknown fields
                      } else {
                        label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                      }
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

        // Load badge template if exists
        if (data.badge_template) {
          const template = data.badge_template;
          
          // Set as legacy template for editing
          setCurrentTemplateId('legacy');
          setCurrentTemplateName(template.name || 'Default Template');
          
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
          // Load print configuration
          if (template.printConfiguration) {
            setPrintConfiguration(template.printConfiguration);
          }
        }
      }
    } catch (error) {
      console.error('Error loading event from Supabase:', error);
    }
  };

  // Load saved templates
  const loadTemplates = async (autoLoadDefault: boolean = false) => {
    try {
      const templates = await loadBadgeTemplates(eventId);
      setSavedTemplates(templates);
      
      // Auto-load default template if requested and no template is currently loaded
      if (autoLoadDefault && templates.length > 0 && !currentTemplateId) {
        const defaultTemplate = templates.find(t => t.is_default) || templates[0];
        loadTemplateIntoDesigner(defaultTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Load template into designer
  const loadTemplateIntoDesigner = (template: BadgeTemplate) => {
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
      setCanvasComponents(data.components.map((c: any) => normalizeComponent(c)));
    }
    
    if (data.printConfiguration) {
      setPrintConfiguration(data.printConfiguration);
    }
  };

  // Save as new template
  const handleSaveAsTemplate = async () => {
    if (!settings || !newTemplateName.trim()) return;
    
    setIsSavingTemplate(true);
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

      const result = await saveBadgeTemplate(
        eventId,
        newTemplateName.trim(),
        templateData,
        saveAsDefault
      );

      if (result.success && result.template) {
        setCurrentTemplateId(result.template.id);
        setCurrentTemplateName(result.template.name);
        await loadTemplates();
        setShowSaveTemplateDialog(false);
        setNewTemplateName('');
        setSaveAsDefault(false);
        alert('Template saved successfully!');
      } else {
        alert('Failed to save template: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Update existing template
  const handleUpdateTemplate = async () => {
    if (!settings) return;
    
    // If no currentTemplateId but has currentTemplateName, we need to find the template by name
    let templateIdToUpdate = currentTemplateId;
    
    if (!templateIdToUpdate && currentTemplateName) {
      // Try to find template by name in savedTemplates
      const matchingTemplate = savedTemplates.find(t => t.name === currentTemplateName);
      if (matchingTemplate) {
        templateIdToUpdate = matchingTemplate.id;
        setCurrentTemplateId(matchingTemplate.id); // Fix the state
      } else {
        // No matching template found, prompt to save as new
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

      // If it's a legacy template, save to events.badge_template
      if (templateIdToUpdate === 'legacy') {
        const { error } = await supabase
          .from('events')
          .update({
            badge_template: {
              ...templateData,
              name: currentTemplateName
            }
          })
          .eq('id', eventId);

        if (error) {
          alert('Failed to update template: ' + error.message);
        } else {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 1500);
        }
      } else {
        // Update in badge_templates table
        const result = await saveBadgeTemplate(
          eventId,
          currentTemplateName,
          templateData,
          false,
          templateIdToUpdate
        );

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

  // Delete template - reserved for future template management UI
  const _handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const result = await deleteBadgeTemplate(templateId);
      if (result.success) {
        if (currentTemplateId === templateId) {
          setCurrentTemplateId(null);
          setCurrentTemplateName('');
        }
        await loadTemplates();
      } else {
        alert('Failed to delete template: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };
  // Export for potential external use
  void _handleDeleteTemplate;

  // Load templates on mount - with slight delay to allow loadEvent to complete first
  useEffect(() => {
    if (eventId) {
      // Small delay to ensure loadEvent has a chance to set legacy template first
      const timer = setTimeout(() => {
        loadTemplates(true); // Auto-load default if no template is loaded
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [eventId]);

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      // Store canvas layout in Supabase badge_template field
      const badgeTemplate = {
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
      
      // Update event record in Supabase with badge template
      const { error } = await supabase
        .from('events')
        .update({
          badge_template: badgeTemplate
        })
        .eq('id', eventId);
      
      if (error) {
        throw new Error(`Failed to save badge template: ${error.message}`);
      }

      // Also save canvas layout to localStorage as backup
      localStorage.setItem(`badge_canvas_${eventId}`, JSON.stringify(canvasComponents));
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose?.();
      }, 1500);
    } catch (error) {
      console.error('Error saving badge settings:', error);
      alert('Failed to save badge settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<BadgeSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
  };

  // Test Print function - prints badge with sample data
  const handleTestPrint = async () => {
    if (!settings || !event) return;
    
    setIsPrinting(true);
    
    try {
      // Sample participant data for test print
      const sampleParticipant = {
        id: 'SAMPLE-001',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+62 812 3456 7890',
        company: 'Sample Company Inc.',
        position: 'Software Engineer',
        customData: {} as Record<string, string>
      };

      // Add sample custom field data
      if (event.customFields) {
        event.customFields.forEach((field) => {
          sampleParticipant.customData[field.id] = `Sample ${field.label}`;
        });
      }

      // Generate QR code for sample
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

      // Create print content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to use the test print feature');
        setIsPrinting(false);
        return;
      }

      const selectedSize = BADGE_SIZES[settings.size || 'CR80'];
      const badgeWidth = settings.size === 'custom' ? settings.customWidth || 100 : selectedSize.width;
      const badgeHeight = settings.size === 'custom' ? settings.customHeight || 100 : selectedSize.height;

      // Build badge HTML content
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
            @page {
              size: ${badgeWidth}mm ${badgeHeight}mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .badge {
              width: ${badgeWidth}mm;
              height: ${badgeHeight}mm;
              position: relative;
              background-color: ${settings.backgroundColor || '#f3f4f6'};
              ${settings.backgroundImageUrl ? `background-image: url('${settings.backgroundImageUrl}'); background-size: ${settings.backgroundImageFit || 'cover'}; background-position: center;` : ''}
              overflow: hidden;
              page-break-after: always;
            }
            .badge:last-child {
              page-break-after: auto;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="badge">
            ${componentsHtml}
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
    setCanvasComponents(prev => {
      const newComponents = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      return newComponents;
    });
  };

  // Track component changes for undo/redo (debounced to avoid too many history entries)
  const lastSaveRef = useRef<number>(0);
  const saveComponentsToHistory = (components: CanvasComponent[]) => {
    const now = Date.now();
    // Only save if more than 500ms since last save (debounce)
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
    if (disableAutoZoom) {
      setIsAutoZoom(false);
    }
  };

  const incrementZoom = (delta: number) => {
    applyZoom(zoomLevel + delta, true);
  };

  // Calculate auto-fit zoom based on container size and canvas size
  const calculateAutoFitZoom = (containerWidth: number, containerHeight: number, canvasW: number, canvasH: number) => {
    const padding = 80; // Padding around the canvas
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;
    
    const scaleX = availableWidth / canvasW;
    const scaleY = availableHeight / canvasH;
    
    // Use the smaller scale to ensure canvas fits in both dimensions
    const fitZoom = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x max for auto
    return Math.max(0.25, fitZoom); // Min 0.25x
  };

  // Reset to auto-fit zoom
  const resetToAutoFit = () => {
    setIsAutoZoom(true);
  };

  // Save state to history for undo/redo
  const saveToHistory = (components: CanvasComponent[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...components]);
    if (newHistory.length > maxHistoryLength) {
      newHistory.shift();
    }
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

  // Request delete confirmation
  const requestDeleteComponent = (id: string) => {
    setComponentToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const confirmDeleteComponent = () => {
    if (componentToDelete) {
      saveToHistory(canvasComponents);
      setCanvasComponents(prev => prev.filter(c => c.id !== componentToDelete));
      if (selectedComponentId === componentToDelete) {
        setSelectedComponentId(null);
      }
    }
    setDeleteConfirmOpen(false);
    setComponentToDelete(null);
  };

  const deleteComponent = (id: string) => {
    requestDeleteComponent(id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected component
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId) {
        // Don't trigger if user is typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        requestDeleteComponent(selectedComponentId);
      }
      
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      
      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedComponentId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, historyIndex, history, canvasComponents]);

  // Save to history when components change
  useEffect(() => {
    if (canvasComponents.length > 0) {
      // Initialize history on first load
      if (history.length === 0) {
        saveToHistory(canvasComponents);
      } else {
        // Save changes (debounced)
        saveComponentsToHistory(canvasComponents);
      }
    }
  }, [JSON.stringify(canvasComponents)]);

  // Auto-fit zoom when badge size changes or container resizes
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
    
    // Also update on window resize
    const resizeObserver = new ResizeObserver(updateAutoZoom);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [isAutoZoom, settings?.size, settings?.customWidth, settings?.customHeight]);

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

  return (
    <div className="space-y-6">
      {/* Header - Outside Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Badge Designer</h2>
            <p className="text-sm text-gray-600 mt-1">{event.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Undo/Redo buttons */}
          <TooltipProvider>
            <div className="flex items-center gap-1 mr-2 border-r border-gray-300 pr-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={undo}
                    disabled={!canUndo}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo (Ctrl+Z)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={redo}
                    disabled={!canRedo}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Redo (Ctrl+Y)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          
          <Button
            onClick={handleTestPrint}
            disabled={isPrinting}
            variant="outline"
            className="px-4 h-10 border-primary-300 text-primary-700 hover:bg-primary-50"
          >
            {isPrinting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent mr-2"></div>
                Printing...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Test Print
              </>
            )}
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="px-6 h-10 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 h-10 gradient-primary hover:opacity-90 text-white border-none font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Template
              </>
            )}
            </Button>
        </div>
      </div>

      <div className="min-h-[calc(100vh-280px)] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      <main className="flex-1 min-h-0 px-5 py-5 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="mx-auto grid h-full min-h-[500px] gap-4 max-w-[1800px]" style={{ gridTemplateColumns: '300px 1fr 300px' }}>
          {/* Left Sidebar - CONTROLS - Fixed width */}
          <section className="flex flex-col overflow-hidden rounded-xl border border-primary-200 bg-white shadow-lg min-h-[500px]">
            <div className="px-4 py-3 bg-gradient-to-r gradient-primary">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Badge Controls
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <Accordion type="multiple" defaultValue={['templates', 'size', 'palette']} className="w-full space-y-3">
                {/* Templates Section */}
                <AccordionItem value="templates" className="border border-primary-200 rounded-lg hover:border-primary-300 transition-all bg-white shadow-sm">
                  <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-50 rounded-t-lg">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Templates</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 bg-gray-50 rounded-b-lg">
                    <div className="space-y-3">
                      {/* Current Template */}
                      {(currentTemplateName || currentTemplateId) && (
                        <div className="p-2 bg-primary-50 border border-primary-200 rounded-lg">
                          <p className="text-[10px] text-primary-600 font-medium">Current Template</p>
                          <p className="text-sm font-semibold text-primary-900">{currentTemplateName || 'Unnamed'}</p>
                          {currentTemplateId && currentTemplateId !== 'legacy' && (
                            <p className="text-[9px] text-primary-500 mt-0.5">ID: {currentTemplateId.slice(0, 8)}...</p>
                          )}
                          {currentTemplateId === 'legacy' && (
                            <p className="text-[9px] text-orange-500 mt-0.5">Legacy template (stored in event)</p>
                          )}
                        </div>
                      )}
                      
                      {/* Saved Templates List */}
                      {savedTemplates.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-700">Load Template</Label>
                          <Select
                            value={currentTemplateId || ''}
                            onValueChange={(value) => {
                              const template = savedTemplates.find(t => t.id === value);
                              if (template) loadTemplateIntoDesigner(template);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select template to load" />
                            </SelectTrigger>
                            <SelectContent>
                              {savedTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span>{template.name}</span>
                                    {template.is_default && (
                                      <span className="text-[9px] bg-primary-100 text-primary-700 px-1 rounded">Default</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {/* Save Actions */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowSaveTemplateDialog(true)}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs border-primary-300 text-primary-700 hover:bg-primary-50"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Save As New
                        </Button>
                        {(currentTemplateId || currentTemplateName) && (
                          <Button
                            onClick={handleUpdateTemplate}
                            disabled={isSaving}
                            size="sm"
                            style={{ backgroundColor: '#7c3aed', color: 'white' }}
                            className="flex-1 h-8 text-xs hover:opacity-90"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {isSaving ? 'Saving...' : 'Update'}
                          </Button>
                        )}
                      </div>
                      
                      {savedTemplates.length === 0 && (
                        <p className="text-[10px] text-gray-500 text-center py-2">
                          No saved templates yet. Click "Save As New" to create one.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="size" className="border border-primary-200 rounded-lg hover:border-primary-300 transition-all bg-white shadow-sm">
                  <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-50 rounded-t-lg">
                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Badge Size</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 bg-gray-50 rounded-b-lg">
                    <div className="space-y-3">
                      {/* Size Dropdown */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Size</Label>
                        <Select
                          value={settings.size || 'CR80'}
                          onValueChange={(value: string) => updateSettings({ size: value as any })}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select badge size" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectGroup>
                              <SelectLabel className="text-[10px] font-semibold text-primary-600 uppercase">ID Card Sizes</SelectLabel>
                              {['CR80', 'B1', 'B2', 'B3', 'B4', 'A1', 'A2', 'A3'].map((key) => {
                                const size = BADGE_SIZES[key as keyof typeof BADGE_SIZES];
                                return (
                                  <SelectItem key={key} value={key} className="text-sm">
                                    {size.label}
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-[10px] font-semibold text-primary-600 uppercase">Paper Sizes</SelectLabel>
                              {['A6', 'A7'].map((key) => {
                                const size = BADGE_SIZES[key as keyof typeof BADGE_SIZES];
                                return (
                                  <SelectItem key={key} value={key} className="text-sm">
                                    {size.label}
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel className="text-[10px] font-semibold text-primary-600 uppercase">Custom</SelectLabel>
                              <SelectItem value="custom" className="text-sm">Custom Size</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Orientation Toggle - Works for all sizes */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700">Orientation</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Swap to portrait (height > width)
                              if (width > height) {
                                // For custom size, swap the custom dimensions
                                if (settings.size === 'custom') {
                                  updateSettings({ customWidth: settings.customHeight, customHeight: settings.customWidth });
                                } else {
                                  // For preset sizes, swap to custom with swapped dimensions
                                  const selectedSize = BADGE_SIZES[settings.size as keyof typeof BADGE_SIZES];
                                  updateSettings({ 
                                    size: 'custom' as any, 
                                    customWidth: Math.min(selectedSize.width, selectedSize.height),
                                    customHeight: Math.max(selectedSize.width, selectedSize.height)
                                  });
                                }
                              }
                            }}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                              height >= width
                                ? 'border-primary-500 bg-primary-100 text-primary-900'
                                : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50'
                            }`}
                          >
                            <svg className="w-4 h-6" viewBox="0 0 16 24" fill="currentColor" opacity={0.3} stroke="currentColor" strokeWidth="1">
                              <rect x="1" y="1" width="14" height="22" rx="1" />
                            </svg>
                            Portrait
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Swap to landscape (width > height)
                              if (height > width) {
                                // For custom size, swap the custom dimensions
                                if (settings.size === 'custom') {
                                  updateSettings({ customWidth: settings.customHeight, customHeight: settings.customWidth });
                                } else {
                                  // For preset sizes, swap to custom with swapped dimensions
                                  const selectedSize = BADGE_SIZES[settings.size as keyof typeof BADGE_SIZES];
                                  updateSettings({ 
                                    size: 'custom' as any, 
                                    customWidth: Math.max(selectedSize.width, selectedSize.height),
                                    customHeight: Math.min(selectedSize.width, selectedSize.height)
                                  });
                                }
                              }
                            }}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                              width > height
                                ? 'border-primary-500 bg-primary-100 text-primary-900'
                                : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50'
                            }`}
                          >
                            <svg className="w-6 h-4" viewBox="0 0 24 16" fill="currentColor" opacity={0.3} stroke="currentColor" strokeWidth="1">
                              <rect x="1" y="1" width="22" height="14" rx="1" />
                            </svg>
                            Landscape
                          </button>
                        </div>
                      </div>

                      {settings.size === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Width (mm)</Label>
                            <Input
                              type="number"
                              value={settings.customWidth || 100}
                              onChange={(e) => updateSettings({ customWidth: parseInt(e.target.value) })}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Height (mm)</Label>
                            <Input
                              type="number"
                              value={settings.customHeight || 150}
                              onChange={(e) => updateSettings({ customHeight: parseInt(e.target.value) })}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-sm text-white bg-gradient-to-r gradient-primary rounded-lg px-4 py-3 font-bold text-center shadow-md">
                        {width.toFixed(1)}mm x {height.toFixed(1)}mm
                        <span className="text-xs opacity-80 ml-2">
                          ({width > height ? 'Landscape' : 'Portrait'})
                        </span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="palette" className="border border-primary-200 rounded-lg hover:border-primary-300 transition-all bg-white shadow-sm">
                  <AccordionTrigger className="px-4 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-50 rounded-t-lg">
                    <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Component Palette</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 bg-gray-50 rounded-b-lg max-h-[400px] overflow-y-auto">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-primary-700 uppercase tracking-wider px-1 py-1">Basic Elements</div>
                      <div className="grid grid-cols-3 gap-1">
                        <PaletteItem type="eventName" label="Event Name" onAdd={handlePaletteAdd}>
                          <Type className="h-3 w-3 text-primary-600 flex-shrink-0" />
                          <span className="text-xs truncate">Event</span>
                        </PaletteItem>

                        <PaletteItem type="qrcode" label="QR Code" onAdd={handlePaletteAdd}>
                          <QrCode className="h-3 w-3 text-primary-600 flex-shrink-0" />
                          <span className="text-xs truncate">QR</span>
                        </PaletteItem>

                        <PaletteItem type="logo" label="Event Logo" onAdd={handlePaletteAdd}>
                          <ImageIcon className="h-3 w-3 text-primary-600 flex-shrink-0" />
                          <span className="text-xs truncate">Logo</span>
                        </PaletteItem>
                      </div>

                      <div className="border-t border-primary-200 my-2"></div>

                      <div className="text-[10px] font-semibold text-primary-700 uppercase tracking-wider px-1 py-1">Standard Fields</div>
                      <div className="grid grid-cols-2 gap-1">
                        {availableFields.filter(f => ['name', 'email', 'phone', 'company', 'position'].includes(f.name)).map(field => (
                          <PaletteItem
                            key={field.name}
                            type="field"
                            fieldName={field.name}
                            label={field.label}
                            onAdd={handlePaletteAdd}
                          >
                            <Type className="h-3 w-3 text-primary-600 flex-shrink-0" />
                            <span className="text-xs truncate">{field.label}</span>
                          </PaletteItem>
                        ))}
                      </div>

                      {/* Custom Fields - only show if there are custom fields */}
                      {availableFields.filter(f => !['name', 'email', 'phone', 'company', 'position'].includes(f.name)).length > 0 && (
                        <>
                          <div className="text-[10px] font-semibold text-green-700 uppercase tracking-wider px-1 py-1 mt-2">Custom Fields</div>
                          <div className="grid grid-cols-2 gap-1">
                            {availableFields.filter(f => !['name', 'email', 'phone', 'company', 'position'].includes(f.name)).map(field => (
                              <PaletteItem
                                key={field.name}
                                type="field"
                                fieldName={field.name}
                                label={field.label}
                                onAdd={handlePaletteAdd}
                              >
                                <Type className="h-3 w-3 text-green-600 flex-shrink-0" />
                                <span className="text-xs truncate">{field.label}</span>
                              </PaletteItem>
                            ))}
                          </div>
                        </>
                      )}

                      <div className="border-t border-primary-100 my-1.5"></div>

                      <PaletteItem type="customText" label="Custom Text" onAdd={handlePaletteAdd}>
                        <Type className="h-3 w-3 text-primary-600 flex-shrink-0" />
                        <span className="text-xs">Custom Text</span>
                      </PaletteItem>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="background" className="border border-primary-200 rounded-lg hover:border-primary-300 transition-all bg-white shadow-sm">
                  <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-50 rounded-t-lg">
                    <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Background</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 bg-gray-50 rounded-b-lg">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-primary-700">Color</Label>
                        <div className="flex gap-3">
                          <Input
                            type="color"
                            value={settings.backgroundColor}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            className="w-12 h-10 p-1 rounded border border-primary-300"
                          />
                          <Input
                            type="text"
                            value={settings.backgroundColor}
                            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                            placeholder="#ffffff"
                            className="h-10 text-sm flex-1 border-gray-200 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <Label className="text-xs font-semibold text-primary-700 mb-2 block">Image</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploadingBg}
                          className="h-9 text-xs w-full border-primary-300 text-primary-700 hover:bg-primary-50 transition-all duration-200"
                          onClick={() => document.getElementById('bg-file-input')?.click()}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
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

                      {settings.backgroundImageUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSettings({ backgroundImageUrl: '', backgroundImageFit: 'cover' })}
                          className="h-9 text-xs w-full text-red-600 border-red-200 hover:bg-red-50 transition-all duration-200"
                        >
                          Remove Image
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="print" className="border border-primary-200 rounded-lg hover:border-primary-300 transition-all bg-white shadow-sm">
                  <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-50 rounded-t-lg">
                    <span className="flex items-center gap-2"><Printer className="h-4 w-4" /> Print Settings</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 bg-gray-50 rounded-b-lg max-h-[400px] overflow-y-auto">
                    <BadgePrintSettings
                      configuration={printConfiguration}
                      badgeWidth={width}
                      badgeHeight={height}
                      onConfigurationChange={setPrintConfiguration}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Center - Canvas Preview - Flexible but stable */}
          <section className="min-h-[500px] flex flex-col overflow-hidden rounded-xl border border-primary-200 bg-white shadow-lg">
            <div className="px-4 py-3 bg-gradient-to-r gradient-primary flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Badge Preview
              </h2>
              <TooltipProvider>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => incrementZoom(-0.1)}
                        className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-md transition-all duration-200"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zoom Out</p>
                    </TooltipContent>
                  </Tooltip>
                  <input
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.05"
                    value={zoomLevel}
                    onChange={(event) => applyZoom(parseFloat(event.target.value), true)}
                    className="w-24 accent-white h-2 rounded-full"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => incrementZoom(0.1)}
                        className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-md transition-all duration-200"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zoom In</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-xs font-bold w-12 text-center text-white">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <div className="w-px h-5 bg-white/30 mx-1"></div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={resetToAutoFit}
                        className={`h-8 px-2 text-xs text-white hover:bg-white/20 rounded-md transition-all duration-200 ${isAutoZoom ? 'bg-white/30' : ''}`}
                      >
                        Fit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Auto-fit to view</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="w-px h-5 bg-white/30 mx-1"></div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPrintPreview(!showPrintPreview)}
                        className={`h-8 px-2 text-xs text-white hover:bg-white/20 rounded-md transition-all duration-200 flex items-center gap-1 ${showPrintPreview ? 'bg-white/30' : ''}`}
                      >
                        <FileText className="h-3 w-3" />
                        Paper
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{showPrintPreview ? 'Hide paper preview' : 'Show paper preview'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            <div 
              ref={previewContainerRef}
              className="flex-1 flex items-center justify-center overflow-auto bg-gradient-to-br from-slate-50 via-primary-50 to-blue-50 p-6"
            >
              {showPrintPreview ? (
                /* Print Preview Mode - Show badge on paper */
                (() => {
                  /* IIFE to calculate paper dimensions */
                  // Calculate paper dimensions
                  const paperSize = PRINT_PAPER_SIZES[printConfiguration.sizeType] || PRINT_PAPER_SIZES.A4;
                  const paperW = printConfiguration.sizeType === 'Custom' && printConfiguration.customWidth 
                    ? printConfiguration.customWidth 
                    : paperSize.width;
                  const paperH = printConfiguration.sizeType === 'Custom' && printConfiguration.customHeight 
                    ? printConfiguration.customHeight 
                    : paperSize.height;
                  // Apply orientation - swap dimensions for landscape
                  const finalPaperW = printConfiguration.orientation === 'landscape' ? paperH : paperW;
                  const finalPaperH = printConfiguration.orientation === 'landscape' ? paperW : paperH;
                  
                  return (
                    <div
                      className="relative transform transition-transform duration-200 ease-out"
                      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                    >
                      {/* Paper outline */}
                      <div 
                        className="relative bg-white shadow-2xl rounded-sm"
                        style={{ 
                          width: `${finalPaperW * CANVAS_SCALE}px`,
                          height: `${finalPaperH * CANVAS_SCALE}px`,
                          border: '2px dashed #9333ea',
                          backgroundImage: 'linear-gradient(45deg, #f8f8f8 25%, transparent 25%), linear-gradient(-45deg, #f8f8f8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f8f8 75%), linear-gradient(-45deg, transparent 75%, #f8f8f8 75%)',
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                        }}
                      >
                        {/* Paper size label */}
                        <div className="absolute -top-6 left-0 text-xs text-primary-600 font-medium">
                          Paper: {finalPaperW.toFixed(0)}mm x {finalPaperH.toFixed(0)}mm ({printConfiguration.sizeType})
                        </div>
                    
                    {/* Badge centered on paper */}
                    <div className="absolute inset-0 flex items-center justify-center">
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
                      />
                    </div>
                  </div>
                </div>
                  );
                })()
              ) : (
                /* Design Mode - Show badge only */
                <div
                  className="relative transform transition-transform duration-200 ease-out shadow-2xl rounded-lg"
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
                  />
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-gradient-to-r gradient-primary">
              <div className="flex items-center justify-between text-white">
                <span className="text-xs font-semibold">
                  Badge: {width.toFixed(1)}mm x {height.toFixed(1)}mm
                </span>
                <div className="flex items-center gap-3">
                  {showPrintPreview && (() => {
                    const paperSize = PRINT_PAPER_SIZES[printConfiguration.sizeType] || PRINT_PAPER_SIZES.A4;
                    const pW = printConfiguration.sizeType === 'Custom' && printConfiguration.customWidth 
                      ? printConfiguration.customWidth : paperSize.width;
                    const pH = printConfiguration.sizeType === 'Custom' && printConfiguration.customHeight 
                      ? printConfiguration.customHeight : paperSize.height;
                    // Swap dimensions for landscape orientation
                    const finalW = printConfiguration.orientation === 'landscape' ? pH : pW;
                    const finalH = printConfiguration.orientation === 'landscape' ? pW : pH;
                    return (
                      <span className="text-xs opacity-80">
                        Paper: {finalW.toFixed(0)}mm x {finalH.toFixed(0)}mm
                      </span>
                    );
                  })()}
                  <span className="text-xs opacity-80">
                    {settings.size?.toUpperCase() || 'CR80'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Sidebar - COMPONENT SETTINGS - Fixed width */}
          <section className="flex flex-col overflow-hidden rounded-xl border border-primary-200 bg-white shadow-lg min-h-[500px]">
            <div className="px-4 py-3 bg-gradient-to-r gradient-primary">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Component Settings
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedComponent ? (
                <ComponentStylingPanel
                  component={selectedComponent}
                  onUpdate={(updates) => updateComponent(selectedComponent.id, updates)}
                  onDelete={() => deleteComponent(selectedComponent.id)}
                  logoUrl={settings.logoUrl}
                  onLogoUrlChange={(url) => updateSettings({ logoUrl: url })}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center px-4">
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-100 to-blue-100 flex items-center justify-center">
                      <MousePointer2 className="h-8 w-8 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Select a component</p>
                      <p className="text-xs text-gray-500 mt-2 max-w-[200px] mx-auto">
                        Click any component on the canvas to edit its properties
                      </p>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-400 font-medium mb-2">Keyboard Shortcuts</p>
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Delete</kbd>
                          <span>Remove component</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+Z</kbd>
                          <span>Undo</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Esc</kbd>
                          <span>Deselect</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete Component?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this component? This action can be undone with Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteComponent}
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              className="px-4 py-2 hover:opacity-90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Save as New Template</DialogTitle>
            <DialogDescription className="text-gray-600">
              Give your badge template a name so you can use it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name" className="text-sm font-medium text-gray-700">
                Template Name
              </Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Conference Badge, VIP Badge"
                className="h-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="save-as-default"
                checked={saveAsDefault}
                onCheckedChange={setSaveAsDefault}
              />
              <Label htmlFor="save-as-default" className="text-sm text-gray-600 cursor-pointer">
                Set as default template for this event
              </Label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={() => {
                setShowSaveTemplateDialog(false);
                setNewTemplateName('');
                setSaveAsDefault(false);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAsTemplate}
              disabled={!newTemplateName.trim() || isSavingTemplate}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !newTemplateName.trim() || isSavingTemplate ? '#a78bfa' : '#7c3aed',
                color: 'white',
                cursor: !newTemplateName.trim() || isSavingTemplate ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSavingTemplate ? (
                <>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid white', 
                    borderTopColor: 'transparent', 
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
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
      className="w-full flex items-center gap-1.5 px-2 py-1.5 min-h-[32px] bg-gradient-to-r from-primary-50 to-transparent border border-primary-200 rounded hover:from-primary-100 hover:to-primary-50 hover:border-primary-400 hover:shadow-sm transition-all duration-200 text-left text-xs font-medium text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 active:scale-[0.98]"
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
    backgroundSize: '10px 10px',
    backgroundImage:
      'linear-gradient(to right, rgba(124, 58, 237, 0.2) 1px, transparent 1px), ' +
      'linear-gradient(to bottom, rgba(124, 58, 237, 0.2) 1px, transparent 1px)',
    opacity: 0.5
  };

  // Center guidelines
  const centerX = width / 2;
  const centerY = height / 2;

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

      {/* Center horizontal line */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 0,
          top: `${(centerY / height) * 100}%`,
          width: '100%',
          height: '1px',
          backgroundColor: 'rgba(200, 100, 255, 0.3)',
          borderTop: '1px dashed rgba(124, 58, 237, 0.4)'
        }}
        aria-hidden="true"
      />

      {/* Center vertical line */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${(centerX / width) * 100}%`,
          top: 0,
          width: '1px',
          height: '100%',
          backgroundColor: 'rgba(200, 100, 255, 0.3)',
          borderLeft: '1px dashed rgba(124, 58, 237, 0.4)'
        }}
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
    // Map text-align to justify-content for flexbox (consistent with print)
    const justifyContent = component.textAlign === 'center' ? 'center' : component.textAlign === 'right' ? 'flex-end' : 'flex-start';
    
    if (component.type === 'eventName') {
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontSize: `${component.fontSize}px`,
            fontFamily: component.fontFamily,
            fontWeight: component.fontWeight,
            fontStyle: component.fontStyle,
            justifyContent,
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
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontSize: `${component.fontSize}px`,
            fontFamily: component.fontFamily,
            fontWeight: component.fontWeight,
            fontStyle: component.fontStyle,
            justifyContent,
            color: ensureReadableColor(component.color)
          }}
        >
          <span>Sample {component.label}</span>
        </div>
      );
    }

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

    if (component.type === 'customText') {
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontSize: `${component.fontSize}px`,
            fontFamily: component.fontFamily,
            fontWeight: component.fontWeight,
            fontStyle: component.fontStyle,
            justifyContent,
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
      className={`${isSelected ? 'ring-2 ring-primary-500 ring-offset-2 shadow-lg' : 'hover:ring-1 hover:ring-primary-300'}`}
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
          <div className="absolute -top-7 left-0 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-3 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none shadow-md font-medium">
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
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Component Settings</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete Component (Delete key)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Component Type</Label>
          <p className="text-sm font-semibold text-primary-700">{component.label || component.type}</p>
        </div>

        <Accordion type="multiple" defaultValue={accordionDefaults} className="flex flex-col gap-3">
          {isTextComponent && (
            <AccordionItem value="text" className="border border-slate-200 border-b-0 rounded-xl bg-white shadow-inner">
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-slate-700">
                Text & Formatting
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-4 pb-5 max-h-[calc(100vh-360px)] overflow-y-auto space-y-5">
                {(component.type === 'customText' || component.type === 'eventName') && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-600">
                      {component.type === 'eventName' ? 'Display Text Override' : 'Text Content'}
                    </Label>
                    <Input
                      value={component.customText || ''}
                      onChange={(e) => onUpdate({ customText: e.target.value })}
                      placeholder={component.type === 'eventName' ? 'Leave blank to use event name' : 'Enter custom text'}
                      className="h-10 text-sm"
                    />
                    {component.type === 'eventName' && (
                      <p className="text-xs text-slate-500 mt-1">
                        Leaving this empty will display the event name automatically.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Font Size</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={component.fontSize || 16}
                      onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                      min={8}
                      max={72}
                      className="h-10 text-sm"
                    />
                    <span className="text-sm text-slate-500 font-medium">px</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Font Family</Label>
                  <Select
                    value={component.fontFamily || 'sans-serif'}
                    onValueChange={(value: string) => onUpdate({ fontFamily: value })}
                  >
                    <SelectTrigger className="h-10 text-sm">
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

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Style</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={component.fontWeight === 'bold' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        onUpdate({
                          fontWeight: component.fontWeight === 'bold' ? 'normal' : 'bold'
                        })
                      }
                      className={`h-10 flex-1 transition-all duration-200 ${component.fontWeight === 'bold' ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white' : ''}`}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={component.fontStyle === 'italic' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        onUpdate({
                          fontStyle: component.fontStyle === 'italic' ? 'normal' : 'italic'
                        })
                      }
                      className={`h-10 flex-1 transition-all duration-200 ${component.fontStyle === 'italic' ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white' : ''}`}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Alignment</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={component.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onUpdate({ textAlign: 'left' })}
                      className={`h-10 flex-1 transition-all duration-200 ${component.textAlign === 'left' ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white' : ''}`}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={component.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onUpdate({ textAlign: 'center' })}
                      className={`h-10 flex-1 transition-all duration-200 ${component.textAlign === 'center' ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white' : ''}`}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={component.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onUpdate({ textAlign: 'right' })}
                      className={`h-10 flex-1 transition-all duration-200 ${component.textAlign === 'right' ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white' : ''}`}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Text Color</Label>
                  <div className="flex gap-3">
                    <Input
                      type="color"
                      value={component.color || '#1f2937'}
                      onChange={(e) => onUpdate({ color: e.target.value })}
                      className="w-12 h-10 p-1 rounded-lg border border-slate-200"
                    />
                    <Input
                      type="text"
                      value={component.color || '#1f2937'}
                      onChange={(e) => onUpdate({ color: e.target.value })}
                      placeholder="#1f2937"
                      className="h-10 text-sm flex-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="position" className="border border-slate-200 border-b-0 rounded-xl bg-white shadow-inner">
            <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-slate-700">
              Position & Size
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Position X (%)</Label>
                  <Input
                    type="number"
                    value={component.x.toFixed(1)}
                    onChange={(e) => onUpdate({ x: parseFloat(e.target.value) })}
                    min={0}
                    max={100}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Position Y (%)</Label>
                  <Input
                    type="number"
                    value={component.y.toFixed(1)}
                    onChange={(e) => onUpdate({ y: parseFloat(e.target.value) })}
                    min={0}
                    max={100}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Width (%)</Label>
                  <Input
                    type="number"
                    value={component.width.toFixed(1)}
                    onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
                    min={5}
                    max={100}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-600">Height (%)</Label>
                  <Input
                    type="number"
                    value={component.height.toFixed(1)}
                    onChange={(e) => onUpdate({ height: parseFloat(e.target.value) })}
                    min={3}
                    max={100}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 border-t-2 border-slate-200 pt-4">
                <Switch
                  checked={component.enabled}
                  onCheckedChange={(checked: boolean | 'indeterminate') => onUpdate({ enabled: checked as boolean })}
                />
                <Label className="text-sm font-semibold text-slate-600">Show on badge</Label>
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
