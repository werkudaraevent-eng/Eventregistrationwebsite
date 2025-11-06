/**
 * BrandingSettings - Manage Registration Form Branding
 * 
 * Allows event organizers to customize:
 * - Event logo and positioning
 * - Color scheme (primary and background)
 * - Typography
 * - Custom header text
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Palette, Upload, Eye, Save, X } from 'lucide-react';
import localDB from '../utils/localDBStub';
import type { BrandingSettings as BrandingSettingsType } from '../utils/localDBStub';

type BrandingSettings = BrandingSettingsType;

interface BrandingSettingsProps {
  eventId: string;
  onUpdated?: () => void;
}

export function BrandingSettings({ eventId, onUpdated }: BrandingSettingsProps) {
  const [branding, setBranding] = useState<BrandingSettings>({
    logoAlignment: 'center',
    logoSize: 'medium',
    primaryColor: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: 'sans-serif'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBranding();
  }, [eventId]);

  const loadBranding = () => {
    const settings = localDB.getBrandingSettings(eventId);
    setBranding(settings);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const logoUrl = event.target?.result as string;
      setBranding(prev => ({ ...prev, logoUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setBranding(prev => ({ ...prev, logoUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localDB.updateBrandingSettings(eventId, branding);
      alert('Branding settings saved successfully!');
      onUpdated?.();
    } catch (err) {
      console.error('Error saving branding:', err);
      alert('Failed to save branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getRegistrationUrl = () => {
    return `${window.location.origin}${window.location.pathname}#/register/${eventId}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Registration Page Branding
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your public registration form
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Event Logo</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {branding.logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG up to 2MB. Recommended size: 400x150px
                </p>
              </div>
              {branding.logoUrl && (
                <div className="relative">
                  <img
                    src={branding.logoUrl}
                    alt="Logo preview"
                    className="h-20 w-auto object-contain border rounded"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Logo Settings */}
          {branding.logoUrl && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo Size</Label>
                <Select
                  value={branding.logoSize}
                  onValueChange={(value: any) => 
                    setBranding(prev => ({ ...prev, logoSize: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Logo Alignment</Label>
                <Select
                  value={branding.logoAlignment}
                  onValueChange={(value: any) => 
                    setBranding(prev => ({ ...prev, logoAlignment: value }))
                  }
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
            </div>
          )}

          {/* Custom Header */}
          <div className="space-y-2">
            <Label htmlFor="customHeader">Custom Header Text</Label>
            <Textarea
              id="customHeader"
              placeholder="e.g., 'Join us for the 2025 Annual Summit'"
              value={branding.customHeader || ''}
              onChange={(e) => 
                setBranding(prev => ({ ...prev, customHeader: e.target.value }))
              }
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Optional tagline displayed below the logo
            </p>
          </div>

          {/* Color Scheme */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => 
                    setBranding(prev => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={branding.primaryColor}
                  onChange={(e) => 
                    setBranding(prev => ({ ...prev, primaryColor: e.target.value }))
                  }
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for buttons and accents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={branding.backgroundColor}
                  onChange={(e) => 
                    setBranding(prev => ({ ...prev, backgroundColor: e.target.value }))
                  }
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={branding.backgroundColor}
                  onChange={(e) => 
                    setBranding(prev => ({ ...prev, backgroundColor: e.target.value }))
                  }
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Page background color
              </p>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Select
              value={branding.fontFamily}
              onValueChange={(value: any) => 
                setBranding(prev => ({ ...prev, fontFamily: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sans-serif">Sans-Serif (Default)</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Registration URL */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Registration URL</Label>
            <div className="flex gap-2">
              <Input
                value={getRegistrationUrl()}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(getRegistrationUrl());
                  alert('Registration URL copied to clipboard!');
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this URL for public registration with your custom branding
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              This is how your registration form will appear to participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 rounded-lg p-8"
              style={{ backgroundColor: branding.backgroundColor }}
            >
              <div className="max-w-xl mx-auto space-y-4">
                {/* Logo Preview */}
                {branding.logoUrl && (
                  <div className={`flex ${
                    branding.logoAlignment === 'left' ? 'justify-start' :
                    branding.logoAlignment === 'right' ? 'justify-end' :
                    'justify-center'
                  }`}>
                    <img
                      src={branding.logoUrl}
                      alt="Logo"
                      className={`object-contain ${
                        branding.logoSize === 'small' ? 'h-12' :
                        branding.logoSize === 'large' ? 'h-24' :
                        'h-16'
                      }`}
                    />
                  </div>
                )}

                {/* Custom Header Preview */}
                {branding.customHeader && (
                  <p 
                    className="text-center text-lg"
                    style={{ color: branding.primaryColor }}
                  >
                    {branding.customHeader}
                  </p>
                )}

                {/* Sample Form Elements */}
                <div className="text-center">
                  <h2 className="text-2xl mb-2">Event Name</h2>
                  <p className="text-sm text-muted-foreground">Sample event information</p>
                </div>

                <div className="bg-white p-6 rounded-lg border space-y-4">
                  <Input placeholder="Full Name *" disabled />
                  <Input placeholder="Email Address *" disabled />
                  <Button 
                    className="w-full" 
                    disabled
                    style={{
                      backgroundColor: branding.primaryColor,
                      borderColor: branding.primaryColor
                    }}
                  >
                    Complete Registration
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
