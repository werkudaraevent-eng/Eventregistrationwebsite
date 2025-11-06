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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { AlertCircle, CheckCircle2, Calendar, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import type { Event, BrandingSettings } from '../utils/localDBStub';

interface PublicRegistrationFormProps {
  eventId: string;
}

export function PublicRegistrationForm({ eventId }: PublicRegistrationFormProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
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
      
      console.log('[REGISTRATION] Loaded event:', loadedEvent.name);
      console.log('[REGISTRATION] Branding settings:', brandingSettings);
      
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
      // Create participant record with UUID
      const participantId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const participant: any = {
        id: participantId,
        eventId: eventId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        position: formData.position,
        registeredAt: new Date().toISOString(),
        attendance: [],
        customData: formData.customData
      };
      
      // Save participant to Supabase
      const { error } = await supabase
        .from('participants')
        .insert([participant]);
      
      if (error) {
        throw new Error(`Failed to register: ${error.message}`);
      }
      
      console.log('[REGISTRATION] Participant registered:', participant.id);
      
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

  const sortedCustomFields = event?.customFields?.sort((a, b) => a.order - b.order) || [];

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
        backgroundColor: branding?.backgroundColor || '#f0f9ff'
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Event Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
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
            
            {/* Custom Header Text */}
            {branding?.customHeader && (
              <p 
                className="text-lg mb-2"
                style={{ color: branding.primaryColor }}
              >
                {branding.customHeader}
              </p>
            )}
            
            <CardTitle className="text-3xl">{event?.name}</CardTitle>
            <div className="text-muted-foreground text-base mt-2">
              <div className="flex items-center justify-center gap-4 mt-2">
                {event?.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(event.startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {event?.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
            {event?.description && (
              <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
            )}
          </CardHeader>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Register Now</CardTitle>
            <CardDescription>Please fill out the form below to register</CardDescription>
          </CardHeader>
          <CardContent>
            <style>{`
              .registration-form label:has(+ input[required])::after,
              .registration-form label:has(+ textarea[required])::after,
              .registration-form label:has(+ select[required])::after {
                content: ' *';
                color: ${branding?.primaryColor || '#dc2626'};
              }
            `}</style>
            <form onSubmit={handleSubmit} className="space-y-6 registration-form">
              {/* Required Fields */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">BASIC INFORMATION</h3>
                
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Position/Title</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="Your job title"
                  />
                </div>
              </div>

              {/* Custom Fields */}
              {sortedCustomFields.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground">ADDITIONAL INFORMATION</h3>
                  
                  {sortedCustomFields.map(field => (
                    <div key={field.id}>
                      <Label htmlFor={field.id}>
                        {field.label} {field.required && '*'}
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
                className="w-full"
                size="lg"
                disabled={isSubmitting}
                style={branding?.primaryColor ? {
                  backgroundColor: branding.primaryColor,
                  borderColor: branding.primaryColor
                } : undefined}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          By registering, you agree to receive event-related communications.
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
              Thank you for registering for <strong>{event?.name}</strong>.
              <br />
              <br />
              You will receive an email shortly containing your QR code and further event details.
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
