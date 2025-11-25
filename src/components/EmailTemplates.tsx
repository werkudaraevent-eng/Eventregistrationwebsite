import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Plus, Mail, Edit, Trash2, Copy, Bold, Italic, Link as LinkIcon, Paperclip, X, Upload, Send, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { Alert, AlertDescription } from './ui/alert';

interface EmailTemplate {
  id: string;
  event_id: string;
  name: string;
  subject: string;
  body: string;
  type: 'registration_confirmation' | 'reminder' | 'custom';
  attachments?: string[]; // Array of file URLs
  include_qr_code?: boolean; // Whether to include participant QR code
  created_at: string;
  updated_at: string;
}

interface EmailTemplatesProps {
  eventId: string;
}

export function EmailTemplates({ eventId }: EmailTemplatesProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Email blast states
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<EmailTemplate | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, failed: 0 });
  
  // Test email states
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testTemplate, setTestTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'registration_confirmation' as EmailTemplate['type'],
    attachments: [] as string[],
    include_qr_code: false,
  });

  useEffect(() => {
    loadTemplates();
  }, [eventId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading email templates:', error);
      } else {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingFile(true);

      // Create storage bucket path with original filename
      // Sanitize filename to remove special characters
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '_');
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${eventId}/${timestamp}_${random}_${sanitizedName}`;
      
      console.log('[Upload] Original filename:', file.name);
      console.log('[Upload] Sanitized filename:', sanitizedName);
      console.log('[Upload] Storage path:', fileName);
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('email-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        
        // Specific error messages
        if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
          alert('⚠️ Storage bucket "email-attachments" belum dibuat!\n\nSilakan:\n1. Buka Supabase Dashboard > Storage\n2. Create bucket: "email-attachments"\n3. Centang "Public bucket"\n4. Refresh page ini');
        } else if (error.message.includes('row-level security') || error.message.includes('policy')) {
          alert('⚠️ Storage bucket policy belum di-set!\n\nSilakan:\n1. Buka Supabase Dashboard > Storage > email-attachments\n2. Go to Policies tab\n3. Disable RLS atau tambah policy untuk INSERT\n4. Refresh page ini');
        } else {
          alert('Failed to upload file: ' + error.message);
        }
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('email-attachments')
        .getPublicUrl(fileName);

      // Add to attachments array
      setFormData({
        ...formData,
        attachments: [...formData.attachments, publicUrl]
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = (urlToRemove: string) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter(url => url !== urlToRemove)
    });
  };

  const getFileNameFromUrl = (url: string) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    // Remove timestamp and random string prefix
    return fileName.split('_').slice(1).join('_');
  };

  const handleCreateTemplate = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      type: 'registration_confirmation',
      attachments: [],
      include_qr_code: false,
    });
    setShowCreateDialog(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
      attachments: template.attachments || [],
      include_qr_code: template.include_qr_code || false,
    });
    setShowEditDialog(true);
  };

  const handleDuplicateTemplate = (template: EmailTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      body: template.body,
      type: template.type,
      attachments: template.attachments || [],
      include_qr_code: template.include_qr_code || false,
    });
    setShowCreateDialog(true);
  };

  const handleSubmitCreate = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert([
          {
            event_id: eventId,
            name: formData.name,
            subject: formData.subject,
            body: formData.body,
            type: formData.type,
            attachments: formData.attachments.length > 0 ? formData.attachments : null,
            include_qr_code: formData.include_qr_code,
          },
        ]);

      if (error) {
        console.error('Error creating template:', error);
        alert('Error creating template');
      } else {
        setShowCreateDialog(false);
        loadTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Error creating template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editingTemplate || !formData.name || !formData.subject || !formData.body) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: formData.name,
          subject: formData.subject,
          body: formData.body,
          type: formData.type,
          attachments: formData.attachments.length > 0 ? formData.attachments : null,
          include_qr_code: formData.include_qr_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTemplate.id);

      if (error) {
        console.error('Error updating template:', error);
        alert('Error updating template');
      } else {
        setShowEditDialog(false);
        setEditingTemplate(null);
        loadTemplates();
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Error updating template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        alert('Error deleting template');
      } else {
        loadTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  // Email blast functions
  const handleOpenSendDialog = async (template: EmailTemplate) => {
    setSendingTemplate(template);
    setSendProgress({ sent: 0, total: 0, failed: 0 });
    setShowSendDialog(true);
  };

  const replacePlaceholders = (text: string, participant: any, event: any): string => {
    return text
      .replace(/\{\{name\}\}/g, participant.name || '')
      .replace(/\{\{email\}\}/g, participant.email || '')
      .replace(/\{\{phone\}\}/g, participant.phone || '')
      .replace(/\{\{company\}\}/g, participant.company || '')
      .replace(/\{\{position\}\}/g, participant.position || '')
      .replace(/\{\{event_name\}\}/g, event.name || '')
      .replace(/\{\{event_date\}\}/g, event.startDate || '')
      .replace(/\{\{participant_id\}\}/g, participant.id || '');
  };

  const handleSendEmails = async () => {
    if (!sendingTemplate) return;

    try {
      setIsSending(true);

      // Get event details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      // Get all participants
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('eventId', eventId);

      if (participantsError || !participants) {
        throw new Error('Failed to load participants');
      }

      setSendProgress({ sent: 0, total: participants.length, failed: 0 });

      console.log('=== STARTING EMAIL BLAST ===');
      console.log('Template:', sendingTemplate.name);
      console.log('Recipients:', participants.length);
      console.log('Subject:', sendingTemplate.subject);
      
      let sent = 0;
      let failed = 0;

      // Send emails with rate limiting (10 emails per second max)
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        
        try {
          // Replace placeholders
          const personalizedSubject = replacePlaceholders(sendingTemplate.subject, participant, eventData);
          const personalizedBody = replacePlaceholders(sendingTemplate.body, participant, eventData);

          console.log(`📧 Sending ${i + 1}/${participants.length} to: ${participant.email}`);

          // Send email via Supabase Edge Function
          const { data, error: sendError } = await supabase.functions.invoke('send-email', {
            body: {
              to: participant.email,
              subject: personalizedSubject,
              html: personalizedBody,
              participantId: participant.id,
              templateId: sendingTemplate.id
            }
          });

          if (sendError) {
            console.error(`❌ Failed to send to ${participant.email}:`, sendError);
            failed++;
            
            // Update status to failed
            await supabase.rpc('update_participant_email_status', {
              p_participant_id: participant.id,
              p_template_id: sendingTemplate.id,
              p_template_name: sendingTemplate.name,
              p_subject: personalizedSubject,
              p_status: 'failed',
              p_error_message: sendError.message || 'Failed to send'
            });
          } else {
            console.log(`✅ Sent to ${participant.email}`);
            sent++;
            
            // Update status to sent
            await supabase.rpc('update_participant_email_status', {
              p_participant_id: participant.id,
              p_template_id: sendingTemplate.id,
              p_template_name: sendingTemplate.name,
              p_subject: personalizedSubject,
              p_status: 'sent',
              p_error_message: null
            });
          }

          setSendProgress({ sent, total: participants.length, failed });

          // Rate limiting: delay between emails (100ms = max 10 emails/second)
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error('Error sending to:', participant.email, error);
          failed++;
          setSendProgress({ sent, total: participants.length, failed });
        }
      }

      console.log(`\n=== EMAIL BLAST COMPLETE ===`);
      console.log(`Total: ${participants.length}`);
      console.log(`Sent: ${sent}`);
      console.log(`Failed: ${failed}`);

      alert(`✅ Email blast complete!\n\nSent: ${sent}\nFailed: ${failed}\nTotal: ${participants.length}`);
      
      setShowSendDialog(false);
      setSendingTemplate(null);
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Error sending emails: ' + (error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  // Test email functions
  const handleOpenTestDialog = (template: EmailTemplate) => {
    setTestTemplate(template);
    setTestEmail('');
    setShowTestDialog(true);
  };

  const handleSendTestEmail = async () => {
    if (!testTemplate || !testEmail) {
      alert('Please enter a test email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setIsSending(true);

      // Get event details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      // Create sample participant data for preview
      const sampleParticipant = {
        id: 'SAMPLE-ID-12345',
        name: 'John Doe',
        email: testEmail,
        phone: '+62 812-3456-7890',
        company: 'Sample Company',
        position: 'Sample Position',
      };

      // Replace placeholders
      const personalizedSubject = replacePlaceholders(testTemplate.subject, sampleParticipant, eventData);
      const personalizedBody = replacePlaceholders(testTemplate.body, sampleParticipant, eventData);

      // Log test email preview
      console.log('=== TEST EMAIL PREVIEW ===');
      console.log('To:', testEmail);
      console.log('Subject:', personalizedSubject);

      // Send test email via Supabase Edge Function
      const { data, error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: personalizedSubject,
          html: personalizedBody,
          participantId: sampleParticipant.id,
          templateId: testTemplate.id
        }
      });

      if (sendError) {
        console.error('❌ Failed to send test email:', sendError);
        alert(`❌ Failed to send test email\n\nError: ${sendError.message}`);
        return;
      }

      console.log('✅ Test email sent successfully:', data);
      alert(`✅ Test email sent to ${testEmail}!\n\nCheck your inbox.`);
      
      setShowTestDialog(false);
      setTestTemplate(null);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Error sending test email: ' + (error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  // Helper functions for text formatting
  const insertTextAtCursor = (text: string, textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.body;
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    setFormData({ ...formData, body: newValue });
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const wrapSelectedText = (before: string, after: string, textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.body.substring(start, end);
    const currentValue = formData.body;
    
    if (selectedText) {
      const newValue = currentValue.substring(0, start) + before + selectedText + after + currentValue.substring(end);
      setFormData({ ...formData, body: newValue });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      }, 0);
    } else {
      const newValue = currentValue.substring(0, start) + before + after + currentValue.substring(end);
      setFormData({ ...formData, body: newValue });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length);
      }, 0);
    }
  };

  const handleBold = (target?: HTMLElement) => {
    if (editorMode === 'visual' && target?.isContentEditable) {
      document.execCommand('bold', false);
      const content = target.innerHTML;
      setFormData({ ...formData, body: content });
    } else {
      const textarea = document.getElementById('body-html') as HTMLTextAreaElement;
      if (textarea) wrapSelectedText('<strong>', '</strong>', textarea);
    }
  };

  const handleItalic = (target?: HTMLElement) => {
    if (editorMode === 'visual' && target?.isContentEditable) {
      document.execCommand('italic', false);
      const content = target.innerHTML;
      setFormData({ ...formData, body: content });
    } else {
      const textarea = document.getElementById('body-html') as HTMLTextAreaElement;
      if (textarea) wrapSelectedText('<em>', '</em>', textarea);
    }
  };

  const handleLink = (target?: HTMLElement) => {
    const url = prompt('Enter URL:');
    if (url) {
      if (editorMode === 'visual' && target?.isContentEditable) {
        document.execCommand('createLink', false, url);
        const content = target.innerHTML;
        setFormData({ ...formData, body: content });
      } else {
        const textarea = document.getElementById('body-html') as HTMLTextAreaElement;
        if (textarea) wrapSelectedText(`<a href="${url}">`, '</a>', textarea);
      }
    }
  };

  const handleInsertPlaceholder = (placeholder: string, target?: HTMLElement) => {
    const placeholderText = `{{${placeholder}}}`;
    if (editorMode === 'visual' && target?.isContentEditable) {
      document.execCommand('insertText', false, placeholderText);
      const content = target.innerHTML;
      setFormData({ ...formData, body: content });
    } else {
      const textarea = document.getElementById('body-html') as HTMLTextAreaElement;
      if (textarea) insertTextAtCursor(placeholderText, textarea);
    }
  };

  const getTemplateTypeLabel = (type: EmailTemplate['type']) => {
    switch (type) {
      case 'registration_confirmation':
        return 'Registration Confirmation';
      case 'reminder':
        return 'Reminder';
      case 'custom':
        return 'Custom';
      default:
        return type;
    }
  };

  const getTemplateTypeBadgeColor = (type: EmailTemplate['type']) => {
    switch (type) {
      case 'registration_confirmation':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'reminder':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'custom':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage email templates for participant communication
            </p>
          </div>
        </div>
        <Button
          onClick={handleCreateTemplate}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No email templates yet</h3>
            <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
              Create your first email template to start communicating with participants
            </p>
            <Button onClick={handleCreateTemplate} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getTemplateTypeBadgeColor(template.type)}`}>
                        {getTemplateTypeLabel(template.type)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Subject:</div>
                  <div className="text-sm text-gray-900">{template.subject}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Body Preview:</div>
                  <div 
                    className="text-sm text-gray-600 line-clamp-3 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: template.body }}
                  />
                </div>
                {/* Attachments Indicator */}
                {template.attachments && template.attachments.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div className="flex items-center gap-2 text-xs text-blue-900">
                      <Paperclip className="h-3 w-3" />
                      <span className="font-medium">
                        {template.attachments.length} Attachment{template.attachments.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {template.attachments.slice(0, 2).map((url, idx) => (
                        <div key={idx} className="text-xs text-blue-700 truncate">
                          • {getFileNameFromUrl(url)}
                        </div>
                      ))}
                      {template.attachments.length > 2 && (
                        <div className="text-xs text-blue-600 font-medium">
                          +{template.attachments.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* QR Code Indicator */}
                {template.include_qr_code && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                    <div className="flex items-center gap-2 text-xs text-purple-900">
                      <span className="text-base">📱</span>
                      <span className="font-medium">
                        QR Code Enabled
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-purple-700">
                      Participant QR codes will be attached
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  {/* Test Email Button */}
                  <Button
                    onClick={() => handleOpenTestDialog(template)}
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    size="sm"
                  >
                    <Mail className="mr-2 h-3 w-3" />
                    Send Test Email
                  </Button>
                </div>
                
                <div className="flex gap-2 border-t pt-2">
                  <Button
                    onClick={() => handleEditTemplate(template)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDuplicateTemplate(template)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Duplicate
                  </Button>
                  <Button
                    onClick={() => handleDeleteTemplate(template.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Registration Confirmation"
              />
            </div>
            <div>
              <Label htmlFor="type">Template Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: EmailTemplate['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registration_confirmation">Registration Confirmation</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Welcome to {{event_name}}!"
              />
            </div>
            <div>
              <Label htmlFor="body">Email Body *</Label>
              
              {/* Formatting Toolbar */}
              <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border rounded-lg flex-wrap">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = document.getElementById('body') as HTMLElement;
                      handleBold(target);
                    }}
                    className="h-8 w-8 p-0"
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = document.getElementById('body') as HTMLElement;
                      handleItalic(target);
                    }}
                    className="h-8 w-8 p-0"
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = document.getElementById('body') as HTMLElement;
                      handleLink(target);
                    }}
                    className="h-8 w-8 p-0"
                    title="Insert Link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="h-6 w-px bg-gray-300"></div>
                
                <div className="text-xs font-semibold text-gray-700">Insert:</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('body') as HTMLElement;
                    handleInsertPlaceholder('name', target);
                  }}
                  className="h-7 text-xs"
                >
                  Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('body') as HTMLElement;
                    handleInsertPlaceholder('email', target);
                  }}
                  className="h-7 text-xs"
                >
                  Email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('body') as HTMLElement;
                    handleInsertPlaceholder('event_name', target);
                  }}
                  className="h-7 text-xs"
                >
                  Event Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('body') as HTMLElement;
                    handleInsertPlaceholder('company', target);
                  }}
                  className="h-7 text-xs"
                >
                  Company
                </Button>
              </div>

              <Tabs value={editorMode} onValueChange={(v: string) => setEditorMode(v as 'visual' | 'html')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="visual">Visual</TabsTrigger>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                </TabsList>
                <TabsContent value="visual" className="mt-0">
                  <div
                    id="body"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                      const content = e.currentTarget.innerHTML;
                      setFormData({ ...formData, body: content });
                    }}
                    dangerouslySetInnerHTML={{ __html: formData.body || '<p>Dear {{name}},</p><p><br></p><p>Thank you for registering for {{event_name}}!</p><p><br></p><p>Use the toolbar above to format text.</p><p><br></p><p>Best regards,<br>Event Team</p>' }}
                    className="min-h-[350px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans overflow-y-auto"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </TabsContent>
                <TabsContent value="html" className="mt-0">
                  <Textarea
                    id="body-html"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="<p>Dear {{name}},</p>&#10;<p>Thank you for registering for {{event_name}}!</p>"
                    rows={14}
                    className="font-mono text-xs w-full max-w-full break-all resize-none"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Attachments Section */}
            <div>
              <Label htmlFor="attachments">Attachments (Optional)</Label>
              <div className="mt-2 space-y-2">
                {/* Upload Button */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploadingFile}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingFile ? 'Uploading...' : 'Upload File'}
                  </Button>
                  <span className="text-xs text-gray-500">Max 5MB (PDF, DOC, XLS, Images)</span>
                </div>

                {/* Attachments List */}
                {formData.attachments.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-2">
                    {formData.attachments.map((url, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">
                            {getFileNameFromUrl(url)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(url)}
                          className="h-7 w-7 p-0 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-blue-900 mb-2">Available Placeholders:</div>
              <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{name}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{email}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{event_name}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{event_date}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{event_location}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{company}}'}</code>
              </div>
            </div>

            {/* QR Code Option - CREATE DIALOG */}
            <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <Checkbox
                id="include-qr-create"
                checked={formData.include_qr_code}
                onCheckedChange={(checked: boolean) => 
                  setFormData({ ...formData, include_qr_code: checked })
                }
              />
              <div className="flex-1">
                <Label 
                  htmlFor="include-qr-create" 
                  className="text-sm font-medium text-purple-900 cursor-pointer"
                >
                  📱 Include Participant QR Code
                </Label>
                <p className="text-xs text-purple-700 mt-1">
                  Each participant will receive their unique QR code as an attachment
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCreate} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Template Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Registration Confirmation"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Template Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: EmailTemplate['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registration_confirmation">Registration Confirmation</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-subject">Email Subject *</Label>
              <Input
                id="edit-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Welcome to {{event_name}}!"
              />
            </div>
            <div>
              <Label htmlFor="edit-body">Email Body *</Label>
              
              {/* Formatting Toolbar for Edit */}
              <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border rounded-lg flex-wrap">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = document.getElementById('edit-body') as HTMLElement;
                      handleBold(target);
                    }}
                    className="h-8 w-8 p-0"
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = document.getElementById('edit-body') as HTMLElement;
                      handleItalic(target);
                    }}
                    className="h-8 w-8 p-0"
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const target = document.getElementById('edit-body') as HTMLElement;
                      handleLink(target);
                    }}
                    className="h-8 w-8 p-0"
                    title="Insert Link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="h-6 w-px bg-gray-300"></div>
                
                <div className="text-xs font-semibold text-gray-700">Insert:</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('edit-body') as HTMLElement;
                    handleInsertPlaceholder('name', target);
                  }}
                  className="h-7 text-xs"
                >
                  Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('edit-body') as HTMLElement;
                    handleInsertPlaceholder('email', target);
                  }}
                  className="h-7 text-xs"
                >
                  Email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('edit-body') as HTMLElement;
                    handleInsertPlaceholder('event_name', target);
                  }}
                  className="h-7 text-xs"
                >
                  Event Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = document.getElementById('edit-body') as HTMLElement;
                    handleInsertPlaceholder('company', target);
                  }}
                  className="h-7 text-xs"
                >
                  Company
                </Button>
              </div>

              <Tabs value={editorMode} onValueChange={(v: string) => setEditorMode(v as 'visual' | 'html')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="visual">Visual</TabsTrigger>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                </TabsList>
                <TabsContent value="visual" className="mt-0">
                  <div
                    id="edit-body"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                      const content = e.currentTarget.innerHTML;
                      setFormData({ ...formData, body: content });
                    }}
                    dangerouslySetInnerHTML={{ __html: formData.body || '<p>Dear {{name}}...</p>' }}
                    className="min-h-[350px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans overflow-y-auto"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                </TabsContent>
                <TabsContent value="html" className="mt-0">
                  <Textarea
                    id="edit-body-html"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="<p>Dear {{name}},</p>"
                    rows={14}
                    className="font-mono text-xs w-full max-w-full break-all resize-none"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Attachments Section */}
            <div>
              <Label htmlFor="edit-attachments">Attachments (Optional)</Label>
              <div className="mt-2 space-y-2">
                {/* Upload Button */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="edit-file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('edit-file-upload')?.click()}
                    disabled={uploadingFile}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingFile ? 'Uploading...' : 'Upload File'}
                  </Button>
                  <span className="text-xs text-gray-500">Max 5MB (PDF, DOC, XLS, Images)</span>
                </div>

                {/* Attachments List */}
                {formData.attachments.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-2">
                    {formData.attachments.map((url, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">
                            {getFileNameFromUrl(url)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(url)}
                          className="h-7 w-7 p-0 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-blue-900 mb-2">Available Placeholders:</div>
              <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{name}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{email}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{event_name}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{event_date}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{event_location}}'}</code>
                <code className="bg-blue-100 px-2 py-1 rounded">{'{{company}}'}</code>
              </div>
            </div>

            {/* QR Code Option - EDIT DIALOG */}
            <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <Checkbox
                id="include-qr-edit"
                checked={formData.include_qr_code}
                onCheckedChange={(checked: boolean) => 
                  setFormData({ ...formData, include_qr_code: checked })
                }
              />
              <div className="flex-1">
                <Label 
                  htmlFor="include-qr-edit" 
                  className="text-sm font-medium text-purple-900 cursor-pointer"
                >
                  📱 Include Participant QR Code
                </Label>
                <p className="text-xs text-purple-700 mt-1">
                  Each participant will receive their unique QR code as an attachment
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Blast Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Email Blast</DialogTitle>
          </DialogHeader>
          
          {!isSending ? (
            <>
              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <div className="font-semibold mb-1">Template: {sendingTemplate?.name}</div>
                    <div className="text-sm">This will send personalized emails to all participants.</div>
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold">Preview:</div>
                  <div className="text-xs text-gray-700">
                    <strong>Subject:</strong> {sendingTemplate?.subject}
                  </div>
                  <div className="text-xs text-gray-700">
                    <strong>Placeholders will be replaced:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                      <li>{'{{name}}'} → Participant name</li>
                      <li>{'{{email}}'} → Participant email</li>
                      <li>{'{{event_name}}'} → Your event name</li>
                      <li>{'{{event_date}}'} → Event date</li>
                    </ul>
                  </div>
                  {sendingTemplate?.attachments && sendingTemplate.attachments.length > 0 && (
                    <div className="text-xs text-gray-700">
                      <strong>Attachments:</strong> {sendingTemplate.attachments.length} file(s)
                    </div>
                  )}
                  {sendingTemplate?.include_qr_code && (
                    <div className="text-xs text-gray-700">
                      <strong>QR Code:</strong> Enabled (each participant gets unique QR)
                    </div>
                  )}
                </div>

                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription className="text-amber-900 text-sm">
                    <strong>⚠️ Important:</strong> Currently in simulation mode. To actually send emails, you need to configure an email service (SendGrid, AWS SES, etc.) in your Supabase Edge Functions.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendEmails} className="gradient-primary">
                  <Send className="mr-2 h-4 w-4" />
                  Send Emails
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-8">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
                <div>
                  <div className="text-lg font-semibold">Sending emails...</div>
                  <div className="text-sm text-gray-600 mt-2">
                    {sendProgress.sent} of {sendProgress.total} sent
                    {sendProgress.failed > 0 && (
                      <span className="text-red-600 ml-2">
                        ({sendProgress.failed} failed)
                      </span>
                    )}
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Send a preview email to test how it looks before sending to all participants
            </p>
          </DialogHeader>
          
          {!isSending ? (
            <div className="space-y-4">
              {/* Template Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div>
                  <span className="text-sm font-semibold text-gray-700">Template:</span>
                  <span className="text-sm text-gray-900 ml-2">{testTemplate?.name}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-700">Subject:</span>
                  <span className="text-sm text-gray-900 ml-2">{testTemplate?.subject}</span>
                </div>
              </div>

              {/* Sample Data Info */}
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-sm text-blue-900">
                  📧 The test email will use sample participant data:
                  <div className="mt-2 ml-4 text-xs space-y-1 text-blue-800">
                    <div>• Name: John Doe</div>
                    <div>• Email: {testEmail || '[your test email]'}</div>
                    <div>• Phone: +62 812-3456-7890</div>
                    <div>• Company: Sample Company</div>
                    <div>• Position: Sample Position</div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Test Email Input */}
              <div className="space-y-2">
                <Label htmlFor="testEmail">Send test email to:</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="your.email@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Enter your email address to receive the test email
                </p>
              </div>

              {/* Template Features */}
              <div className="space-y-2">
                {testTemplate?.attachments && testTemplate.attachments.length > 0 && (
                  <div className="text-sm text-gray-700">
                    📎 <strong>{testTemplate.attachments.length}</strong> attachment(s) will be included
                  </div>
                )}
                {testTemplate?.include_qr_code && (
                  <div className="text-sm text-gray-700">
                    📱 Participant QR code will be included
                  </div>
                )}
              </div>

              {/* Warning */}
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-sm text-amber-900">
                  ⚠️ <strong>Simulation Mode:</strong> Currently in simulation mode. 
                  Email preview will be shown in the browser console. 
                  Configure an email service (SendGrid/AWS SES) to actually send emails.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  onClick={() => {
                    setShowTestDialog(false);
                    setTestTemplate(null);
                    setTestEmail('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendTestEmail}
                  className="gradient-primary"
                  disabled={!testEmail}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
              <p className="mt-4 text-gray-700">Sending test email...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
