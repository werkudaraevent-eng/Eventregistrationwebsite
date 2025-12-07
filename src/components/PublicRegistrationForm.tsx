/**
 * PublicRegistrationForm - Event-Specific Self-Registration Interface
 * 
 * This is a public-facing form accessible via /register/:eventId
 * Allows participants to self-register for events with:
 * - Basic participant information
 * - Custom fields defined by event organizers
 * - Custom branding (logo, colors, fonts)
 * - Automatic eventId association
 * 
 * Note: Session attendance is managed by organizers after registration
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import type { Event, BrandingSettings, ColumnVisibility } from '../utils/localDBStub';
import { createParticipant } from '../utils/supabaseDataLayer';

interface PublicRegistrationFormProps {
  eventId: string;
}

export function PublicRegistrationForm({ eventId }: PublicRegistrationFormProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    phone: true,
    company: true,
    position: true,
    attendance: true,
    registered: true
  });
  const [fieldRequirements, setFieldRequirements] = useState<{
    phone?: boolean;
    company?: boolean;
    position?: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    customData: {} as Record<string, any>
  });

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    setIsLoading(true);
    try {
      // Load event from Supabase
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (eventError || !eventData) {
        setError('Event not found. Please check the registration link.');
        setIsLoading(false);
        return;
      }
      
      const loadedEvent: Event = {
        id: eventData.id,
        name: eventData.name,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        location: eventData.location,
        description: eventData.description,
        createdAt: eventData.createdAt,
        customFields: eventData.customFields || [],
        branding: eventData.branding
      };
      
      setEvent(loadedEvent);
      
      // Load branding settings from event.branding
      const brandingSettings: BrandingSettings = eventData.branding || {
        logoUrl: '',
        headerText: '',
        primaryColor: '#7C3AED',
        backgroundColor: '#FFFFFF',
        fontFamily: 'sans-serif'
      };
      
      setBranding(brandingSettings);
      
      // Load column visibility settings
      const visibility: ColumnVisibility = eventData.columnVisibility || {
        phone: true,
        company: true,
        position: true,
        attendance: true,
        registered: true
      };
      setColumnVisibility(visibility);

      // Load field requirements (stored inside branding object)
      const requirements = (brandingSettings as any).fieldRequirements || {};
      setFieldRequirements(requirements);
      
      console.log('[REGISTRATION] Loaded event:', loadedEvent.name);
      console.log('[REGISTRATION] Branding settings:', brandingSettings);
      console.log('[REGISTRATION] Email auto-send enabled?', brandingSettings.autoSendConfirmation);
      console.log('[REGISTRATION] Template ID:', brandingSettings.confirmationTemplateId);
      console.log('[REGISTRATION] Column visibility:', visibility);
      console.log('[REGISTRATION] Field requirements:', requirements);
      
      setIsLoading(false);
    } catch (err) {
      console.error('[REGISTRATION] Error loading event:', err);
      setError('Failed to load registration form. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customData: { ...prev.customData, [fieldId]: value }
    }));
  };

  const handleCloseSuccessModal = () => {
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      customData: {}
    });
    setSuccess(false);
    setError(null);
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = (): boolean => {
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate built-in required fields based on fieldRequirements
    if (fieldRequirements.phone && columnVisibility.phone && !formData.phone.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    
    if (fieldRequirements.company && columnVisibility.company && !formData.company.trim()) {
      setError('Please enter your company');
      return false;
    }
    
    if (fieldRequirements.position && columnVisibility.position && !formData.position.trim()) {
      setError('Please enter your position');
      return false;
    }
    
    // Validate custom required fields
    if (event?.customFields) {
      for (const field of event.customFields) {
        if (field.required && !formData.customData[field.id]) {
          setError(`${field.label} is required`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('[REGISTRATION] 🔵 Submitting form data:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        position: formData.position,
        customData: formData.customData,
        customDataKeys: Object.keys(formData.customData),
        customDataValues: Object.values(formData.customData)
      });
      
      // Create participant using the data layer function
      // This ensures proper field mapping to database schema
      const participant = await createParticipant({
        eventId: eventId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        position: formData.position,
        customData: formData.customData
      });
      
      console.log('[REGISTRATION] ✅ Participant created:', participant);
      console.log('[REGISTRATION] 🔍 Participant customData from response:', participant.customData);
      
      // Send auto confirmation email if enabled
      console.log('[REGISTRATION] Email settings check:', {
        autoSendEnabled: branding?.autoSendConfirmation,
        templateId: branding?.confirmationTemplateId,
        hasTemplate: !!branding?.confirmationTemplateId
      });
      
      if (branding?.autoSendConfirmation && branding?.confirmationTemplateId) {
        console.log('[REGISTRATION] Attempting to send confirmation email to:', formData.email);
        
        try {
          // Fetch email template from database
          console.log('[REGISTRATION] 📧 Fetching template:', branding.confirmationTemplateId);
          
          const { data: template, error: templateError } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', branding.confirmationTemplateId)
            .single();
          
          if (templateError || !template) {
            console.error('[REGISTRATION] ❌ Failed to fetch template:', templateError);
            throw new Error(`Email template not found: ${branding.confirmationTemplateId}`);
          }
          
          console.log('[REGISTRATION] ✅ Template loaded:', template.name);
          
          // Personalize template with participant data
          const personalizedSubject = template.subject
            .replace(/\{\{name\}\}/g, formData.name)
            .replace(/\{\{email\}\}/g, formData.email);
          
          let personalizedBody = template.body
            .replace(/\{\{name\}\}/g, formData.name)
            .replace(/\{\{email\}\}/g, formData.email)
            .replace(/\{\{participant_id\}\}/g, participant.id);
          
          // Prepare attachments array - include template attachments + QR code if enabled
          let emailAttachments: string[] = template.attachments || [];
          
          console.log('[REGISTRATION] Template attachments:', emailAttachments);
          console.log('[REGISTRATION] Include QR code?', template.include_qr_code);
          console.log('[REGISTRATION] Participant QR URL:', participant.qr_code_url);
          
          // Add QR code if enabled in template and available
          if (template.include_qr_code && participant.qr_code_url) {
            console.log('[REGISTRATION] Adding QR code to attachments');
            emailAttachments = [
              ...emailAttachments,
              participant.qr_code_url
            ];
          } else if (template.include_qr_code && !participant.qr_code_url) {
            console.warn('[REGISTRATION] ⚠️ QR code requested but not available for participant');
          }

          // Create email log first to get tracking ID
          const { data: emailLogData, error: logCreateError } = await supabase
            .from('participant_emails')
            .insert({
              participant_id: participant.id,
              template_id: template.id,
              template_name: template.name,
              subject: personalizedSubject,
              status: 'pending'
            })
            .select()
            .single();

          let emailLogId = emailLogData?.id;

          // Add tracking pixel if email log created successfully
          if (emailLogId) {
            const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
            // Method 1: Tracking pixel (may be blocked by Gmail)
            const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email?id=${emailLogId}&pid=${participant.id}" width="1" height="1" style="display:none;" alt="" />`;
            
            // Method 2: Add tracking to any existing links (more reliable)
            let bodyWithTracking = personalizedBody;
            
            // Find all clickable links and add tracking parameter
            const linkRegex = /(https?:\/\/[^\s<>"]+)/gi;
            bodyWithTracking = bodyWithTracking.replace(linkRegex, (match) => {
              // Add tracking parameter to links
              const separator = match.includes('?') ? '&' : '?';
              return `${match}${separator}_track=${emailLogId}`;
            });
            
            // Add tracking pixel at the end
            bodyWithTracking = bodyWithTracking + trackingPixel;
            
            personalizedBody = bodyWithTracking;
            console.log('[REGISTRATION] ✅ Tracking pixel added to email');
          }
          
          const emailPayload = {
            to: formData.email,
            subject: personalizedSubject,
            html: personalizedBody,
            participantId: participant.id,
            templateId: template.id,
            attachments: emailAttachments
          };
          
          console.log('[REGISTRATION] 📧 Email payload:', {
            to: emailPayload.to,
            subject: emailPayload.subject,
            participantId: emailPayload.participantId,
            templateId: emailPayload.templateId,
            attachmentsCount: emailAttachments.length,
            attachmentsList: emailAttachments
          });
          
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
            body: emailPayload
          });

          // Update email log status
          if (emailLogId) {
            const emailStatus = emailError ? 'failed' : 'sent';
            await supabase
              .from('participant_emails')
              .update({
                status: emailStatus,
                error_message: emailError ? JSON.stringify(emailError) : null
              })
              .eq('id', emailLogId);
            
            console.log('[REGISTRATION] ✅ Email log updated to:', emailStatus);
          }

          if (emailError) {
            console.error('[REGISTRATION] ❌ Email send error:', emailError);
            console.error('[REGISTRATION] Error details:', JSON.stringify(emailError, null, 2));
            // Don't fail registration if email fails
          } else {
            console.log('[REGISTRATION] ✅ Confirmation email sent successfully to:', formData.email);
            console.log('[REGISTRATION] 📧 Email response:', emailData);
          }
        } catch (emailErr) {
          console.error('[REGISTRATION] ❌ Email exception:', emailErr);
          console.error('[REGISTRATION] Exception details:', JSON.stringify(emailErr, null, 2));
          // Don't fail registration if email fails
        }
      } else {
        console.log('[REGISTRATION] ⚠️ Email not sent - auto-send disabled or template not configured');
        console.log('[REGISTRATION] Debug info:', {
          autoSendConfirmation: branding?.autoSendConfirmation,
          confirmationTemplateId: branding?.confirmationTemplateId,
          brandingObject: branding
        });
      }
      
      // Show success modal
      setSuccess(true);
      
    } catch (err) {
      console.error('[REGISTRATION] Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f0f9ff' }}>
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading registration form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f0f9ff' }}>
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl mb-2">Registration Unavailable</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter and sort custom fields - only show visible fields
  const sortedCustomFields = event?.customFields
    ?.filter(field => field.visible !== false) // Only include fields where visible is true or undefined
    ?.sort((a, b) => a.order - b.order) || [];

  // Determine logo size class
  const getLogoSizeClass = () => {
    if (!branding?.logoSize) return 'h-16';
    switch (branding.logoSize) {
      case 'small': return 'h-12';
      case 'medium': return 'h-16';
      case 'large': return 'h-24';
      default: return 'h-16';
    }
  };

  // Determine logo alignment class
  const getLogoAlignmentClass = () => {
    if (!branding?.logoAlignment) return 'justify-center';
    switch (branding.logoAlignment) {
      case 'left': return 'justify-start';
      case 'center': return 'justify-center';
      case 'right': return 'justify-end';
      default: return 'justify-center';
    }
  };

  // Get font family class
  const getFontFamilyClass = () => {
    if (!branding?.fontFamily) return 'font-sans';
    switch (branding.fontFamily) {
      case 'sans-serif': return 'font-sans';
      case 'serif': return 'font-serif';
      case 'monospace': return 'font-mono';
      default: return 'font-sans';
    }
  };

  return (
    <div 
      className={`min-h-screen py-12 px-6 ${getFontFamilyClass()}`}
      style={{ 
        backgroundColor: branding?.backgroundColor || '#f0f9ff',
        color: branding?.fontColor || '#1F2937',
        fontSize: 
          branding?.fontSize === 'small' ? '0.875rem' :
          branding?.fontSize === 'large' ? '1.125rem' : '1rem'
      }}
    >
      <div 
        className="mx-auto"
        style={{
          maxWidth: 
            branding?.formWidth === 'narrow' ? '400px' :
            branding?.formWidth === 'wide' ? '800px' : '600px'
        }}
      >
        {/* Single Card - Microsoft Forms Style */}
        <Card 
          className="backdrop-blur-md bg-white/60 shadow-xl border border-white/20"
          style={{
            borderRadius: 
              branding?.borderRadius === 'none' ? '0' :
              branding?.borderRadius === 'small' ? '4px' :
              branding?.borderRadius === 'large' ? '12px' : '8px'
          }}
        >
          {/* Header Section - Same as Live Preview */}
          <CardHeader className="text-center pb-6">
            {/* Logo */}
            {branding?.logoUrl && (
              <div className={`flex ${getLogoAlignmentClass()} mb-4`}>
                <img 
                  src={branding.logoUrl} 
                  alt="Event Logo" 
                  className={`${getLogoSizeClass()} object-contain`}
                />
              </div>
            )}

            {/* Custom Header */}
            {branding?.customHeader && (
              <p 
                className="font-semibold text-base mb-4"
                style={{ color: branding.primaryColor || '#7C3AED' }}
              >
                {branding.customHeader}
              </p>
            )}
            
            {/* Event Title */}
            <CardTitle 
              className="text-2xl font-bold mb-4"
              style={{ color: branding?.fontColor || '#1F2937' }}
            >
              {event?.name}
            </CardTitle>
            
            {/* Date & Location Badges - Same as Live Preview */}
            {((branding?.showDate !== false && event?.startDate) || (branding?.showLocation !== false && event?.location)) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                {branding?.showDate !== false && event?.startDate && (
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: branding?.primaryColor ? `${branding.primaryColor}15` : 'rgba(124, 58, 237, 0.1)',
                      color: branding?.primaryColor || '#7C3AED'
                    }}
                  >
                    📅 {new Date(event.startDate).toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </div>
                )}
                {branding?.showLocation !== false && event?.location && (
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: branding?.primaryColor ? `${branding.primaryColor}15` : 'rgba(124, 58, 237, 0.1)',
                      color: branding?.primaryColor || '#7C3AED'
                    }}
                  >
                    📍 {event.location}
                  </div>
                )}
              </div>
            )}
            
            {/* Description */}
            {branding?.showDescription !== false && event?.description && (
              <p className="text-sm text-gray-500">{event.description}</p>
            )}
          </CardHeader>
          
          {/* Form Section */}
          <CardContent>
            <style>{`
              /* Microsoft Forms-style transparent inputs */
              .registration-form input,
              .registration-form textarea,
              .registration-form select {
                background-color: rgba(255, 255, 255, 0.1) !important;
                backdrop-filter: blur(10px);
                border: none !important;
                border-bottom: 2px solid rgba(0, 0, 0, 0.2) !important;
                border-radius: 4px 4px 0 0 !important;
                transition: all 0.3s ease;
                padding: 12px 8px !important;
              }
              
              .registration-form input:hover,
              .registration-form textarea:hover,
              .registration-form select:hover {
                background-color: rgba(255, 255, 255, 0.15) !important;
                border-bottom-color: rgba(0, 0, 0, 0.3) !important;
              }
              
              .registration-form input:focus,
              .registration-form textarea:focus,
              .registration-form select:focus {
                background-color: rgba(255, 255, 255, 0.2) !important;
                border-bottom-color: ${branding?.primaryColor || '#7C3AED'} !important;
                border-bottom-width: 3px !important;
                outline: none !important;
                box-shadow: none !important;
                ring: 0 !important;
              }
              
              .registration-form input::placeholder,
              .registration-form textarea::placeholder {
                color: rgba(0, 0, 0, 0.4);
              }
              
              .registration-form label {
                font-weight: 500;
                font-size: 0.875rem;
                color: ${branding?.fontColor || '#1F2937'};
                margin-bottom: 4px;
              }
            `}</style>
            <form onSubmit={handleSubmit} className="space-y-6 registration-form">
              {/* Required Fields */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">BASIC INFORMATION</h3>
                
                <div>
                  <Label htmlFor="name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                {/* Phone Number - Conditionally rendered */}
                {columnVisibility.phone && (
                  <div>
                    <Label htmlFor="phone">
                      Phone Number {fieldRequirements.phone && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      required={fieldRequirements.phone}
                    />
                  </div>
                )}

                {/* Company - Conditionally rendered */}
                {columnVisibility.company && (
                  <div>
                    <Label htmlFor="company">
                      Company {fieldRequirements.company && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Your company name"
                      required={fieldRequirements.company}
                    />
                  </div>
                )}

                {/* Position - Conditionally rendered */}
                {columnVisibility.position && (
                  <div>
                    <Label htmlFor="position">
                      Position/Title {fieldRequirements.position && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      placeholder="Your job title"
                      required={fieldRequirements.position}
                    />
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              {sortedCustomFields.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground">ADDITIONAL INFORMATION</h3>
                  
                  {sortedCustomFields.map(field => (
                    <div key={field.id}>
                      <Label htmlFor={field.id}>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.id}
                          value={formData.customData[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={field.id}
                          value={formData.customData[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select...</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={field.id}
                          type={field.type}
                          value={formData.customData[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full text-white"
                size="lg"
                disabled={isSubmitting}
                style={{
                  backgroundColor: branding?.buttonColor || branding?.primaryColor,
                  borderColor: branding?.buttonColor || branding?.primaryColor,
                  borderRadius: 
                    branding?.borderRadius === 'none' ? '0' :
                    branding?.borderRadius === 'small' ? '4px' :
                    branding?.borderRadius === 'large' ? '12px' : '8px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  branding?.buttonText || 'Complete Registration'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p 
          className="text-center text-sm mt-6"
          style={{ color: branding?.footerColor || '#6B7280' }}
        >
          {branding?.footerText || 'By registering, you agree to receive event-related communications.'}
        </p>
      </div>

      {/* Success Modal */}
      <Dialog open={success} onOpenChange={(open: boolean) => !open && handleCloseSuccessModal()}>
        <DialogContent 
          className="sm:max-w-md" 
          onInteractOutside={(e: any) => e.preventDefault()}
          onEscapeKeyDown={handleCloseSuccessModal}
        >
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              {branding?.logoUrl && (
                <img 
                  src={branding.logoUrl} 
                  alt="Event Logo" 
                  className="h-12 object-contain"
                />
              )}
            </div>
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: branding?.primaryColor ? `${branding.primaryColor}20` : '#dcfce7' }}
              >
                <CheckCircle2 
                  className="h-10 w-10" 
                  style={{ color: branding?.primaryColor || '#16a34a' }} 
                />
              </div>
            </div>
            <DialogTitle className="text-2xl text-center">
              Registration Successful!
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {branding?.successMessage ? (
                <>
                  {branding.successMessage}
                  <br /><br />
                  <span className="text-sm text-muted-foreground">
                    Event: <strong>{event?.name}</strong>
                  </span>
                </>
              ) : (
                <>
                  Thank you for registering for <strong>{event?.name}</strong>.
                  <br /><br />
                  You will receive an email shortly containing your QR code and further event details.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pt-4">
            <Button
              onClick={handleCloseSuccessModal}
              className="w-full sm:w-auto"
              size="lg"
              style={branding?.primaryColor ? {
                backgroundColor: branding.primaryColor,
                borderColor: branding.primaryColor
              } : undefined}
            >
              Register Another Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
