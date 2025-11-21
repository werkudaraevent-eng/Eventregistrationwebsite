import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { 
  Plus, 
  Send, 
  Eye,
  Trash2,
  RefreshCw,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  PlayCircle,
  Users,
  Edit
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import CreateCampaignWizard from './CreateCampaignWizard';
import ParticipantSelector from './ParticipantSelector';

interface Campaign {
  id: string;
  name: string;
  channel: 'email' | 'whatsapp';
  template_id?: string;
  template_name: string;
  template_subject?: string;
  target_type: 'all' | 'filtered' | 'manual';
  target_filter?: any;
  target_participant_ids?: string[];
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'cancelled';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  created_at: string;
  sent_at?: string;
  completed_at?: string;
  notes?: string;
}

interface BlastCampaignsProps {
  eventId: string;
}

export default function BlastCampaigns({ eventId }: BlastCampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [campaignParticipants, setCampaignParticipants] = useState<any[]>([]);
  const [showEditParticipantsModal, setShowEditParticipantsModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [resendingParticipants, setResendingParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCampaigns();
  }, [eventId]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    if (!confirm(`Send campaign "${campaign.name}" to ${campaign.total_recipients} participants?`)) {
      return;
    }

    try {
      setSendingCampaign(campaign.id);

      // Update campaign status to 'sending'
      await supabase
        .from('campaigns')
        .update({ status: 'sending', sent_at: new Date().toISOString() })
        .eq('id', campaign.id);

      // Get target participants
      const { data: participants } = await supabase.rpc('get_campaign_participants', {
        p_event_id: eventId,
        p_target_type: campaign.target_type,
        p_target_filter: campaign.target_filter || {},
        p_target_participant_ids: campaign.target_participant_ids || []
      });

      if (!participants || participants.length === 0) {
        alert('No participants found for this campaign');
        return;
      }

      // Get template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', campaign.template_id)
        .single();

      if (!template) {
        alert('Template not found');
        return;
      }

      // Get event data for placeholders
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      let sent = 0;
      let failed = 0;

      // Send emails
      for (const participant of participants) {
        try {
          // Replace placeholders
          const personalizedSubject = replacePlaceholders(template.subject, participant, eventData);
          const personalizedBody = replacePlaceholders(template.body, participant, eventData);

          // Send via edge function
          const { error: sendError } = await supabase.functions.invoke('send-email', {
            body: {
              to: participant.email,
              subject: personalizedSubject,
              html: personalizedBody,
              participantId: participant.id,
              templateId: template.id
            }
          });

          if (sendError) {
            console.error(`Failed to send to ${participant.email}:`, sendError);
            failed++;
            
            // Log failed email
            await supabase.from('email_logs').insert({
              campaign_id: campaign.id,
              participant_id: participant.id,
              template_id: template.id,
              template_name: template.name,
              subject: personalizedSubject,
              status: 'failed',
              error_message: sendError.message
            });
          } else {
            console.log(`✅ Sent to ${participant.email}`);
            sent++;
            
            // Log sent email
            await supabase.from('email_logs').insert({
              campaign_id: campaign.id,
              participant_id: participant.id,
              template_id: template.id,
              template_name: template.name,
              subject: personalizedSubject,
              status: 'sent'
            });

            // Update participant email status
            await supabase.rpc('update_participant_email_status', {
              p_participant_id: participant.id,
              p_template_id: template.id,
              p_template_name: template.name,
              p_subject: personalizedSubject,
              p_status: 'sent',
              p_error_message: null
            });
          }

          // Update campaign progress
          await supabase.rpc('update_campaign_progress', {
            p_campaign_id: campaign.id,
            p_sent_increment: sent > 0 ? 1 : 0,
            p_failed_increment: failed > 0 ? 1 : 0
          });

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error sending email:', error);
          failed++;
        }
      }

      alert(`✅ Campaign complete!\n\nSent: ${sent}\nFailed: ${failed}\nTotal: ${participants.length}`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Error sending campaign: ' + (error as Error).message);
    } finally {
      setSendingCampaign(null);
    }
  };

  const replacePlaceholders = (text: string, participant: any, event: any) => {
    return text
      .replace(/\{\{name\}\}/g, participant.name || '')
      .replace(/\{\{email\}\}/g, participant.email || '')
      .replace(/\{\{phone\}\}/g, participant.phone || '')
      .replace(/\{\{company\}\}/g, participant.company || '')
      .replace(/\{\{position\}\}/g, participant.position || '')
      .replace(/\{\{event_name\}\}/g, event?.name || '')
      .replace(/\{\{event_date\}\}/g, event?.startDate || '')
      .replace(/\{\{participant_id\}\}/g, participant.id || '');
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    if (!confirm(`Delete campaign "${campaign.name}"?\n\nThis will also delete all associated email logs.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);

      if (error) throw error;

      alert('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Error deleting campaign: ' + (error as Error).message);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const config = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: Clock },
      sending: { label: 'Sending...', className: 'bg-blue-100 text-blue-700', icon: PlayCircle },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: AlertCircle },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700', icon: AlertCircle }
    };
    const { label, className, icon: Icon } = config[status];
    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getChannelBadge = (channel: 'email' | 'whatsapp') => {
    return channel === 'email' ? (
      <Badge variant="outline" className="bg-purple-50">
        <Mail className="h-3 w-3 mr-1" />
        Email
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-green-50">
        <MessageSquare className="h-3 w-3 mr-1" />
        WhatsApp
      </Badge>
    );
  };

  const getTargetTypeBadge = (type: 'all' | 'filtered' | 'manual') => {
    const config = {
      all: { label: 'All Participants', icon: '📋' },
      filtered: { label: 'Filtered', icon: '🔍' },
      manual: { label: 'Manual Selection', icon: '✋' }
    };
    return <span className="text-sm text-gray-600">{config[type].icon} {config[type].label}</span>;
  };

  const handleResendEmail = async (participant: any, campaign: Campaign) => {
    if (!confirm(`Resend email to ${participant.name} (${participant.email})?`)) {
      return;
    }

    try {
      setResendingParticipants(prev => new Set(prev).add(participant.id));

      // Get template
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', campaign.template_id)
        .single();

      if (!template) {
        alert('Template not found');
        return;
      }

      // Get event data for placeholders
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      // Replace placeholders
      const personalizedSubject = replacePlaceholders(template.subject, participant, eventData);
      const personalizedBody = replacePlaceholders(template.body, participant, eventData);

      // Send via edge function
      const { error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          to: participant.email,
          subject: personalizedSubject,
          html: personalizedBody,
          participantId: participant.id,
          templateId: template.id
        }
      });

      if (sendError) {
        console.error(`Failed to send to ${participant.email}:`, sendError);
        
        // Log failed email
        await supabase.from('email_logs').insert({
          campaign_id: campaign.id,
          participant_id: participant.id,
          template_id: template.id,
          template_name: template.name,
          subject: personalizedSubject,
          status: 'failed',
          error_message: sendError.message
        });

        alert('Failed to send email: ' + sendError.message);
      } else {
        console.log(`✅ Sent to ${participant.email}`);
        
        // Log sent email
        await supabase.from('email_logs').insert({
          campaign_id: campaign.id,
          participant_id: participant.id,
          template_id: template.id,
          template_name: template.name,
          subject: personalizedSubject,
          status: 'sent'
        });

        alert(`Email sent successfully to ${participant.email}`);
        
        // Refresh participants list
        if (selectedCampaign) {
          await handleViewParticipants(selectedCampaign);
        }
        
        // Refresh campaigns to update counts
        await fetchCampaigns();
      }
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Error resending email: ' + (error as Error).message);
    } finally {
      setResendingParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(participant.id);
        return newSet;
      });
    }
  };

  const handleViewParticipants = async (campaign: Campaign) => {
    try {
      setSelectedCampaign(campaign);
      const { data, error } = await supabase.rpc('get_campaign_participants', {
        p_event_id: eventId,
        p_target_type: campaign.target_type,
        p_target_filter: campaign.target_filter || {},
        p_target_participant_ids: campaign.target_participant_ids || []
      });

      if (error) throw error;
      
      // Get email tracking status for each participant
      const participantIds = (data || []).map((p: any) => p.id);
      const { data: trackingData } = await supabase
        .from('email_logs')
        .select('participant_id, status')
        .eq('campaign_id', campaign.id)
        .in('participant_id', participantIds);

      // Map tracking status to participants
      const trackingMap = new Map(
        (trackingData || []).map((t: any) => [t.participant_id, t.status])
      );

      const participantsWithStatus = (data || []).map((p: any) => ({
        ...p,
        email_status: trackingMap.get(p.id) || 'pending'
      }));

      setCampaignParticipants(participantsWithStatus);
      setShowParticipantsModal(true);
    } catch (error) {
      console.error('Error fetching participants:', error);
      alert('Error loading participants: ' + (error as Error).message);
    }
  };

  const handleEditParticipants = async (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowEditParticipantsModal(true);
  };

  const handleSaveParticipants = async (selectedIds: string[]) => {
    if (!editingCampaign) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          target_participant_ids: selectedIds,
          total_recipients: selectedIds.length,
          pending_count: selectedIds.length
        })
        .eq('id', editingCampaign.id);

      if (error) throw error;

      alert(`✅ Participants updated!\n\nTotal participants: ${selectedIds.length}`);
      setShowEditParticipantsModal(false);
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating participants:', error);
      alert('Error updating participants: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Blast Campaigns
          </h2>
          <p className="text-gray-600 mt-1">Create and manage email and WhatsApp campaigns</p>
        </div>
        <Button onClick={() => setShowCreateWizard(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {campaigns.filter(c => c.status === 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {campaigns.reduce((sum, c) => sum + c.sent_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {campaigns.length > 0
                ? Math.round(
                    (campaigns.reduce((sum, c) => sum + c.sent_count, 0) /
                      campaigns.reduce((sum, c) => sum + c.total_recipients, 0)) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaign History</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchCampaigns}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-4">Create your first campaign to start sending emails</p>
              <Button onClick={() => setShowCreateWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{getChannelBadge(campaign.channel)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={campaign.template_subject}>
                          {campaign.template_name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">{campaign.sent_count} sent</span>
                            {campaign.failed_count > 0 && (
                              <span className="text-red-600">{campaign.failed_count} failed</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            of {campaign.total_recipients} recipients
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {campaign.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleSendCampaign(campaign)}
                              disabled={sendingCampaign === campaign.id}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowDetailModal(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewParticipants(campaign)}
                            title="View Participants"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          {campaign.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditParticipants(campaign)}
                              title="Edit Participants"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {campaign.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCampaign(campaign)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Wizard */}
      <CreateCampaignWizard
        open={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        eventId={eventId}
        onSuccess={fetchCampaigns}
      />

      {/* Participants Modal */}
      {selectedCampaign && (
        <Dialog open={showParticipantsModal} onOpenChange={setShowParticipantsModal}>
          <DialogContent 
            className="max-h-[90vh] flex flex-col"
            style={{ maxWidth: '95vw', width: '95vw' }}
          >
            <DialogHeader>
              <DialogTitle>Campaign Participants - {selectedCampaign.name}</DialogTitle>
              <DialogDescription>
                {campaignParticipants.length} participants in this campaign
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No participants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaignParticipants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">{participant.name}</TableCell>
                        <TableCell>{participant.email}</TableCell>
                        <TableCell>{participant.company || '-'}</TableCell>
                        <TableCell>{participant.position || '-'}</TableCell>
                        <TableCell>
                          {participant.email_status === 'sent' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          ) : participant.email_status === 'failed' ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          ) : participant.email_status === 'bounced' ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Bounced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendEmail(participant, selectedCampaign)}
                            disabled={resendingParticipants.has(participant.id)}
                            className="h-8"
                          >
                            {resendingParticipants.has(participant.id) ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-1" />
                                Resend
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowParticipantsModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCampaign.name}</DialogTitle>
              <DialogDescription>Campaign details and statistics</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Channel</Label>
                  <div className="mt-1">{getChannelBadge(selectedCampaign.channel)}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Template</Label>
                  <div className="mt-1 font-medium">{selectedCampaign.template_name}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Target Type</Label>
                  <div className="mt-1">{getTargetTypeBadge(selectedCampaign.target_type)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm text-gray-600 mb-3 block">Statistics</Label>
                <div className="flex gap-6 justify-center">
                  <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{selectedCampaign.sent_count}</div>
                    <div className="text-sm text-gray-600">Sent</div>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">{selectedCampaign.failed_count}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{selectedCampaign.total_recipients}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>
              </div>

              {selectedCampaign.notes && (
                <div>
                  <Label className="text-sm text-gray-600">Notes</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">{selectedCampaign.notes}</div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Created: {new Date(selectedCampaign.created_at).toLocaleString()}
                {selectedCampaign.completed_at && (
                  <> • Completed: {new Date(selectedCampaign.completed_at).toLocaleString()}</>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Participants Modal */}
      {editingCampaign && (
        <Dialog open={showEditParticipantsModal} onOpenChange={setShowEditParticipantsModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Participants - {editingCampaign.name}</DialogTitle>
              <DialogDescription>
                Add or remove participants from this campaign
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ParticipantSelector
                eventId={eventId}
                selectedIds={editingCampaign.target_participant_ids || []}
                onSelectionChange={(ids) => {
                  // Update editingCampaign state with new selection
                  setEditingCampaign({
                    ...editingCampaign,
                    target_participant_ids: ids,
                    total_recipients: ids.length
                  });
                }}
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditParticipantsModal(false);
                  setEditingCampaign(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingCampaign.target_participant_ids) {
                    handleSaveParticipants(editingCampaign.target_participant_ids);
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
