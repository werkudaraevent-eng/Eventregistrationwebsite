import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Mail, MessageSquare, ArrowRight, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import ParticipantSelector from './ParticipantSelector';

interface CreateCampaignWizardProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export default function CreateCampaignWizard({ open, onClose, eventId, onSuccess }: CreateCampaignWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Channel selection
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  
  // Step 2: Campaign details
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [notes, setNotes] = useState('');
  
  // Step 3: Target participants
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'all' | 'filtered' | 'manual'>('all');
  const [targetFilter, setTargetFilter] = useState<any>({});
  
  // const [eventData, setEventData] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchEventData();
      if (channel === 'email') {
        fetchEmailTemplates();
      }
    } else {
      // Reset on close
      setStep(1);
      setChannel('email');
      setCampaignName('');
      setSelectedTemplateId('');
      setNotes('');
      setSelectedParticipantIds([]);
      setTargetType('all');
      setTargetFilter({});
    }
  }, [open, eventId]);

  const fetchEventData = async () => {
    // const { data } = await supabase
    //   .from('events')
    //   .select('*')
    //   .eq('id', eventId)
    //   .single();
    // setEventData(data);
  };

  const fetchEmailTemplates = async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('id, name, subject, body')
      .eq('event_id', eventId)
      .order('name');
    setEmailTemplates(data || []);
  };

  const handleSelectionChange = (ids: string[], type: 'all' | 'filtered' | 'manual', filters?: any) => {
    setSelectedParticipantIds(ids);
    setTargetType(type);
    setTargetFilter(filters || {});
  };

  const handleCreateCampaign = async () => {
    try {
      setLoading(true);

      const selectedTemplate = emailTemplates.find(t => t.id === selectedTemplateId);
      if (!selectedTemplate) {
        toast.error('Please select a template');
        setLoading(false);
        return;
      }

      // Create campaign
      const { error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          event_id: eventId,
          name: campaignName,
          channel: channel,
          template_id: selectedTemplateId,
          template_name: selectedTemplate.name,
          template_subject: selectedTemplate.subject,
          target_type: targetType,
          target_filter: targetFilter,
          target_participant_ids: targetType === 'manual' ? selectedParticipantIds : [],
          status: 'draft',
          total_recipients: selectedParticipantIds.length,
          sent_count: 0,
          failed_count: 0,
          pending_count: selectedParticipantIds.length,
          notes: notes
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      setLoading(false);
      
      toast.success(`Campaign "${campaignName}" created!`, {
        description: `Ready to send to ${selectedParticipantIds.length} participants.`,
        duration: 5000,
      });
      
      // Auto close dialog after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setLoading(false);
      toast.error('Failed to create campaign', {
        description: (error as Error).message,
      });
    }
  };

  const canProceedToStep2 = () => {
    return channel !== null;
  };

  const canProceedToStep3 = () => {
    return campaignName.trim() !== '' && selectedTemplateId !== '';
  };

  const canCreateCampaign = () => {
    return selectedParticipantIds.length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        <div className="py-4">{/* Reduced padding from py-6 to py-4 */}
          {/* Step 1: Choose Channel */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Choose Channel</h3>
                <p className="text-sm text-gray-600 mb-4">Select how you want to reach your participants</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email Channel */}
                <button
                  onClick={() => setChannel('email')}
                  className={`p-6 border-2 rounded-lg transition-all ${
                    channel === 'email'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-3 rounded-full ${
                      channel === 'email' ? 'bg-purple-600' : 'bg-gray-200'
                    }`}>
                      <Mail className={`h-8 w-8 ${channel === 'email' ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Email</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Send personalized emails with templates
                      </p>
                    </div>
                    <Badge variant={channel === 'email' ? 'default' : 'outline'}>
                      {emailTemplates.length} templates available
                    </Badge>
                  </div>
                </button>

                {/* WhatsApp Channel */}
                <button
                  onClick={() => setChannel('whatsapp')}
                  disabled
                  className="p-6 border-2 rounded-lg border-gray-200 opacity-50 cursor-not-allowed"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-gray-200">
                      <MessageSquare className="h-8 w-8 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">WhatsApp</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Send messages via WhatsApp
                      </p>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                </button>
              </div>

              <Alert>
                <AlertDescription>
                  {channel === 'email' && '📧 Email campaigns use your configured SendGrid service'}
                  {channel === 'whatsapp' && '💬 WhatsApp integration coming soon'}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Campaign Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Campaign Details</h3>
                <p className="text-sm text-gray-600 mb-4">Configure your campaign settings</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Campaign Name *</Label>
                  <Input
                    placeholder="e.g., H-3 Reminder Blast"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Give your campaign a descriptive name</p>
                </div>

                {channel === 'email' && (
                  <div>
                    <Label>Email Template *</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No templates available
                          </SelectItem>
                        ) : (
                          emailTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedTemplateId && (
                      <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                        <div className="font-medium">
                          {emailTemplates.find(t => t.id === selectedTemplateId)?.subject}
                        </div>
                        <div className="text-gray-600 mt-1 text-xs">
                          {emailTemplates.find(t => t.id === selectedTemplateId)?.body.substring(0, 150)}...
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this campaign..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Target Participants */}
          {step === 3 && (
            <div className="space-y-2">
              <div>
                <h3 className="text-base font-semibold mb-1">Target Participants</h3>
                <p className="text-xs text-gray-600 mb-2">Select who will receive this campaign</p>
              </div>

              <ParticipantSelector
                eventId={eventId}
                onSelectionChange={handleSelectionChange}
                selectedIds={selectedParticipantIds}
              />
            </div>
          )}
        </div>{/* Close py-6 */}

        <DialogFooter className="flex justify-between flex-shrink-0">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  loading ||
                  (step === 1 && !canProceedToStep2()) ||
                  (step === 2 && !canProceedToStep3())
                }
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateCampaign}
                disabled={loading || !canCreateCampaign()}
              >
                <Send className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
