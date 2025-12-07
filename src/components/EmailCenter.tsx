import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { 
  Mail, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  RefreshCw,
  Filter,
  Calendar,
  Eye,
  BarChart3
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { Alert, AlertDescription } from './ui/alert';

interface EmailLog {
  id: string;
  participant_id: string;
  participant_name?: string;
  participant_email?: string;
  template_id: string;
  template_name: string;
  subject: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending' | 'bounced' | 'delivered' | 'opened' | 'clicked';
  error_message?: string;
  opened_at?: string;
  clicked_at?: string;
}

interface EmailStats {
  total_sent: number;
  total_failed: number;
  total_pending: number;
  total_not_sent: number;
  total_participants: number;
  delivery_rate: number;
  last_email_sent: string | null;
}

interface Props {
  eventId: string;
  eventName: string;
}

export default function EmailCenter({ eventId, eventName }: Props) {
  const [stats, setStats] = useState<EmailStats>({
    total_sent: 0,
    total_failed: 0,
    total_pending: 0,
    total_not_sent: 0,
    total_participants: 0,
    delivery_rate: 0,
    last_email_sent: null
  });
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    loadStats();
    loadEmailLogs();
  }, [eventId]);

  useEffect(() => {
    filterLogs();
  }, [emailLogs, statusFilter]);

  const loadStats = async () => {
    try {
      const { data: participants } = await supabase
        .from('participants')
        .select('email_status, last_email_sent_at')
        .eq('eventId', eventId);

      if (participants) {
        const total = participants.length;
        const sent = participants.filter(p => p.email_status === 'sent').length;
        const failed = participants.filter(p => p.email_status === 'failed').length;
        const pending = participants.filter(p => p.email_status === 'pending').length;
        const notSent = participants.filter(p => p.email_status === 'not_sent' || !p.email_status).length;
        
        const lastSent = participants
          .filter(p => p.last_email_sent_at)
          .sort((a, b) => new Date(b.last_email_sent_at).getTime() - new Date(a.last_email_sent_at).getTime())[0];

        setStats({
          total_sent: sent,
          total_failed: failed,
          total_pending: pending,
          total_not_sent: notSent,
          total_participants: total,
          delivery_rate: total > 0 ? Math.round((sent / total) * 100 * 100) / 100 : 0,
          last_email_sent: lastSent?.last_email_sent_at || null
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadEmailLogs = async () => {
    setIsLoading(true);
    try {
      // Get email logs with participant info
      const { data: logs } = await supabase
        .from('participant_emails')
        .select(`
          *,
          participants!inner(id, "eventId", name, email)
        `)
        .eq('participants.eventId', eventId)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (logs) {
        const formattedLogs = logs.map((log: any) => ({
          id: log.id,
          participant_id: log.participant_id,
          participant_name: log.participants?.name,
          participant_email: log.participants?.email,
          template_id: log.template_id,
          template_name: log.template_name,
          subject: log.subject,
          sent_at: log.sent_at,
          status: log.status,
          error_message: log.error_message,
          opened_at: log.opened_at,
          clicked_at: log.clicked_at
        }));
        setEmailLogs(formattedLogs);
      }
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    if (statusFilter === 'all') {
      setFilteredLogs(emailLogs);
    } else {
      setFilteredLogs(emailLogs.filter(log => log.status === statusFilter));
    }
  };

  const handleRefresh = () => {
    loadStats();
    loadEmailLogs();
  };

  const handleViewDetail = (log: EmailLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      sent: { label: 'Sent', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: Send },
      delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      opened: { label: 'Opened', className: 'bg-primary-100 text-primary-800 border-primary-200', icon: Eye },
      clicked: { label: 'Clicked', className: 'bg-primary-100 text-primary-800 border-primary-200', icon: TrendingUp },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      bounced: { label: 'Bounced', className: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle }
    };

    const { label, className, icon: Icon } = config[status] || config.sent;
    
    return (
      <Badge className={`${className} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Email Center</h2>
            <p className="text-sm text-gray-600 mt-1">Monitor and manage email campaigns for {eventName}</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.total_sent}</div>
            <p className="text-xs text-gray-600 mt-1">
              {stats.delivery_rate}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.total_failed}</div>
            <p className="text-xs text-gray-600 mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.total_pending}</div>
            <p className="text-xs text-gray-600 mt-1">In queue</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              Not Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{stats.total_not_sent}</div>
            <p className="text-xs text-gray-600 mt-1">
              of {stats.total_participants} participants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Activity */}
      {stats.last_email_sent && (
        <Alert className="border-blue-200 bg-blue-50">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Last email sent:</strong> {formatDateTime(stats.last_email_sent)} ({formatTimeAgo(stats.last_email_sent)})
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">
            <Mail className="h-4 w-4 mr-2" />
            Email History
          </TabsTrigger>
          <TabsTrigger value="quick-actions">
            <Send className="h-4 w-4 mr-2" />
            Quick Actions
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Email History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Delivery History</CardTitle>
                  <CardDescription>Complete log of all emails sent to participants</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="opened">Opened</SelectItem>
                      <SelectItem value="clicked">Clicked</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="bounced">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-600 mt-2">Loading email history...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No email logs found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {statusFilter !== 'all' 
                      ? `No emails with status: ${statusFilter}` 
                      : 'Start sending emails to see logs here'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.participant_name}</div>
                              <div className="text-xs text-gray-500">{log.participant_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{log.template_name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-xs truncate">{log.subject}</div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDateTime(log.sent_at)}</div>
                            <div className="text-xs text-gray-500">{formatTimeAgo(log.sent_at)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => handleViewDetail(log)}
                              variant="ghost"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5 text-red-600" />
                  Resend Failed Emails
                </CardTitle>
                <CardDescription>
                  Retry sending to {stats.total_failed} participants with failed deliveries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="outline"
                  disabled={stats.total_failed === 0}
                >
                  Resend All Failed
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Send className="h-5 w-5 text-blue-600" />
                  Send to New Participants
                </CardTitle>
                <CardDescription>
                  Send welcome emails to {stats.total_not_sent} participants who haven't received any
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full gradient-primary" 
                  disabled={stats.total_not_sent === 0}
                >
                  Send to All New
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  Schedule Campaign
                </CardTitle>
                <CardDescription>
                  Schedule emails to be sent at a specific date and time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Performance Analytics</CardTitle>
              <CardDescription>Detailed insights about email engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Analytics Dashboard</p>
                <p className="text-sm text-gray-500 mt-2">
                  Coming soon: Open rates, click rates, engagement metrics, and more
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Delivery Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">Participant</Label>
                  <div className="font-medium">{selectedLog.participant_name}</div>
                  <div className="text-sm text-gray-600">{selectedLog.participant_email}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Template</Label>
                <div className="font-medium">{selectedLog.template_name}</div>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Subject</Label>
                <div className="font-medium">{selectedLog.subject}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">Sent At</Label>
                  <div className="text-sm">{formatDateTime(selectedLog.sent_at)}</div>
                </div>
                {selectedLog.opened_at && (
                  <div>
                    <Label className="text-xs text-gray-600">Opened At</Label>
                    <div className="text-sm">{formatDateTime(selectedLog.opened_at)}</div>
                  </div>
                )}
              </div>

              {selectedLog.error_message && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>Error:</strong> {selectedLog.error_message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-semibold text-gray-700 ${className}`}>{children}</div>;
}
