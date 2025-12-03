/**
 * BadgeTemplateSelector Component
 * 
 * Dropdown selector for choosing badge templates.
 * Used in ParticipantManagement and StandaloneCheckInPage.
 */

import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '../utils/supabase/client';
import { FileText } from 'lucide-react';

export interface BadgeTemplate {
  id: string;
  event_id: string;
  name: string;
  is_default: boolean;
  template_data: {
    size?: string;
    customWidth?: number;
    customHeight?: number;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    backgroundImageFit?: string;
    logoUrl?: string;
    components?: any[];
    printConfiguration?: any;
  };
  created_at: string;
  updated_at: string;
}

interface BadgeTemplateSelectorProps {
  eventId: string;
  selectedTemplateId: string | null;
  onTemplateSelect: (template: BadgeTemplate | null) => void;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export function BadgeTemplateSelector({
  eventId,
  selectedTemplateId,
  onTemplateSelect,
  label = 'Badge Template',
  className = '',
  showLabel = true
}: BadgeTemplateSelectorProps) {
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [legacyTemplate, setLegacyTemplate] = useState<BadgeTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [eventId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // Load templates from badge_templates table
      const { data: templatesData, error: templatesError } = await supabase
        .from('badge_templates')
        .select('*')
        .eq('event_id', eventId)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (templatesError) {
        console.error('Error loading badge templates:', templatesError);
      }

      // Also check for legacy template in events table
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('badge_template, name')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error loading event:', eventError);
      }

      const loadedTemplates: BadgeTemplate[] = templatesData || [];

      // If there's a legacy template and no templates in the new table, add it as an option
      if (eventData?.badge_template && loadedTemplates.length === 0) {
        const legacy: BadgeTemplate = {
          id: 'legacy',
          event_id: eventId,
          name: 'Default Template',
          is_default: true,
          template_data: eventData.badge_template,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setLegacyTemplate(legacy);
        loadedTemplates.unshift(legacy);
      }

      setTemplates(loadedTemplates);

      // Auto-select default template if none selected
      if (!selectedTemplateId && loadedTemplates.length > 0) {
        const defaultTemplate = loadedTemplates.find(t => t.is_default) || loadedTemplates[0];
        onTemplateSelect(defaultTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'none') {
      onTemplateSelect(null);
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    onTemplateSelect(template || null);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {label}
        </Label>
      )}
      <Select
        value={selectedTemplateId || 'none'}
        onValueChange={handleTemplateChange}
        disabled={isLoading}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={isLoading ? 'Loading...' : 'Select template'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-gray-500">
            No template selected
          </SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span>{template.name}</span>
                {template.is_default && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {templates.length === 0 && !isLoading && (
        <p className="text-[10px] text-gray-500">
          No templates found. Create one in Badge Designer.
        </p>
      )}
    </div>
  );
}

// Utility function to load templates (for use outside component)
export async function loadBadgeTemplates(eventId: string): Promise<BadgeTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('badge_templates')
      .select('*')
      .eq('event_id', eventId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading badge templates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error loading templates:', error);
    return [];
  }
}

// Utility function to save a badge template
export async function saveBadgeTemplate(
  eventId: string,
  name: string,
  templateData: BadgeTemplate['template_data'],
  isDefault: boolean = false,
  existingId?: string
): Promise<{ success: boolean; template?: BadgeTemplate; error?: string }> {
  try {
    if (existingId) {
      // Update existing template
      const { data, error } = await supabase
        .from('badge_templates')
        .update({
          name,
          template_data: templateData,
          is_default: isDefault
        })
        .eq('id', existingId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, template: data };
    } else {
      // Create new template
      const { data, error } = await supabase
        .from('badge_templates')
        .insert({
          event_id: eventId,
          name,
          template_data: templateData,
          is_default: isDefault
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, template: data };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Utility function to delete a badge template
export async function deleteBadgeTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('badge_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
