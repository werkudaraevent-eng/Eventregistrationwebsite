/**
 * EmailHistory - Centralized Email Sending History
 * 
 * Displays all email sending activity including:
 * - Blast campaigns
 * - Test emails
 * - Registration confirmation emails
 * - Individual emails
 * 
 * Shows status: sent, failed, opened, clicked
 * Includes timestamp and recipient details
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TableCell, TableHead, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { 
  Mail, 
  Search, 
  Filter, 
  Calendar,
  CheckCircle2, 
  XCircle, 
  Clock,
  Eye,
  MousePointerClick,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface EmailLog {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_email: string;
  template_id: string;
  template_name: string;
  subject: string;
  status: 'sent' | 'failed' | 'opened' | 'clicked' | 'pending';
  error_message?: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  email_type: 'blast' | 'test' | 'confirmation' | 'individual';
  campaign_name?: string;
}

interface EmailHistoryProps {
  eventId: string;
}

export function EmailHistory({ eventId }: EmailHistoryProps) {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [sortField, setSortField] = useState<'sent_at' | 'participant_email' | 'status'>('sent_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadEmailHistory();
    
    // Setup realtime subscription
    const subscription = supabase
      .channel(`email_history_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participant_emails'
        },
        () => {
          loadEmailHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [eventId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [emailLogs, searchQuery, statusFilter, typeFilter, sortField, sortDirection]);

  const loadEmailHistory = async () => {
    setIsLoading(true);
    try {
      console.log('[EmailHistory] Loading email history for eventId:', eventId);
      
      // Query participant_emails table with participant info
      const { data, error } = await supabase
        .from('participant_emails')
        .select(`
          id,
          participant_id,
          template_id,
          template_name,
          campaign_id,
          subject,
          status,
          error_message,
          sent_at,
          opened_at,
          clicked_at,
          participants!inner (
            name,
            email,
            "eventId"
          ),
          campaigns (
            name
          )
        `)
        .eq('participants.eventId', eventId)
        .order('sent_at', { ascending: false });

      console.log('[EmailHistory] Query result:', { data, error, count: data?.length });
      
      if (error) throw error;

      // Transform data
      const logs: EmailLog[] = (data || []).map((log: any) => ({
        id: log.id,
        participant_id: log.participant_id,
        participant_name: log.participants.name,
        participant_email: log.participants.email,
        template_id: log.template_id,
        template_name: log.template_name,
        subject: log.subject,
        status: log.status,
        error_message: log.error_message,
        sent_at: log.sent_at,
        opened_at: log.opened_at,
        clicked_at: log.clicked_at,
        email_type: determineEmailType(log.template_name, log.campaign_id),
        campaign_name: log.campaigns?.name || log.template_name
      }));

      setEmailLogs(logs);
      console.log('[EmailHistory] Loaded', logs.length, 'email logs');
    } catch (err) {
      console.error('[EmailHistory] Error loading email history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const determineEmailType = (templateName: string, campaignId?: string): EmailLog['email_type'] => {
    if (campaignId) return 'blast';
    const lower = templateName.toLowerCase();
    if (lower.includes('test')) return 'test';
    if (lower.includes('confirmation') || lower.includes('registration')) return 'confirmation';
    return 'individual';
  };

  const applyFiltersAndSort = () => {
    let filtered = [...emailLogs];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.participant_name.toLowerCase().includes(query) ||
        log.participant_email.toLowerCase().includes(query) ||
        log.subject.toLowerCase().includes(query) ||
        log.template_name.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.email_type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'sent_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const getStatusBadge = (log: EmailLog) => {
    switch (log.status) {
      case 'sent':
        return (
          <Badge className="bg-success-light text-success border-success/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'opened':
        return (
          <Badge className="bg-info-light text-info border-info/20">
            <Eye className="h-3 w-3 mr-1" />
            Opened
          </Badge>
        );
      case 'clicked':
        return (
          <Badge className="bg-primary-100 text-primary-800 border-primary-200">
            <MousePointerClick className="h-3 w-3 mr-1" />
            Clicked
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-error-light text-error border-error/20">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-warning-light text-warning border-warning/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{log.status}</Badge>;
    }
  };

  const getTypeBadge = (type: EmailLog['email_type']) => {
    switch (type) {
      case 'blast':
        return <Badge variant="outline" className="bg-primary-50">Blast Campaign</Badge>;
      case 'test':
        return <Badge variant="outline" className="bg-warning-light">Test Email</Badge>;
      case 'confirmation':
        return <Badge variant="outline" className="bg-success-light">Confirmation</Badge>;
      case 'individual':
        return <Badge variant="outline" className="bg-info-light">Individual</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Recipient', 'Email', 'Subject', 'Campaign', 'Status', 'Type', 'Error'];
    const rows = filteredLogs.map(log => [
      formatDateTime(log.sent_at),
      log.participant_name,
      log.participant_email,
      log.subject,
      log.campaign_name || '-',
      log.status,
      log.email_type,
      log.error_message || '-'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + rowsPerPage);

  // Statistics
  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(l => l.status === 'sent' || l.status === 'opened' || l.status === 'clicked').length,
    opened: emailLogs.filter(l => l.status === 'opened' || l.status === 'clicked').length,
    clicked: emailLogs.filter(l => l.status === 'clicked').length,
    failed: emailLogs.filter(l => l.status === 'failed').length,
    pending: emailLogs.filter(l => l.status === 'pending').length
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
            <h2 className="text-2xl font-bold text-gray-900">Email History</h2>
            <p className="text-sm text-gray-600 mt-1">
              Track all email communications sent to participants
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadEmailHistory} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Compact Horizontal */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-around gap-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Total</div>
              <div className="text-lg font-bold">{stats.total}</div>
            </div>
            <div className="border-l h-10"></div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Sent</div>
              <div className="text-lg font-bold text-success">{stats.sent}</div>
            </div>
            <div className="border-l h-10"></div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Opened</div>
              <div className="text-lg font-bold text-info">{stats.opened}</div>
            </div>
            <div className="border-l h-10"></div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Clicked</div>
              <div className="text-lg font-bold text-primary-600">{stats.clicked}</div>
            </div>
            <div className="border-l h-10"></div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Failed</div>
              <div className="text-lg font-bold text-error">{stats.failed}</div>
            </div>
            <div className="border-l h-10"></div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Pending</div>
              <div className="text-lg font-bold text-warning">{stats.pending}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Filters - Single Row */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient, email, subject, or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 h-9 text-sm border rounded-md bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 h-9 text-sm border rounded-md bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="blast">Blast Campaign</option>
          <option value="confirmation">Confirmation</option>
          <option value="individual">Individual</option>
          <option value="test">Test Email</option>
        </select>
      </div>

      {/* Email History Table */}
      <Card>
        <CardContent className="p-0">
          <div 
            className="overflow-x-auto overflow-y-auto border rounded-lg" 
            style={{ 
              position: 'relative',
              maxHeight: 'calc(100vh - 350px)',
              minHeight: '400px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#a855f7 #f3f4f6'
            }}
          >
            {/* Use native table for proper sticky header */}
            <table className="w-full caption-bottom text-sm">
              <thead 
                style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 30, 
                  backgroundColor: 'white', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }} 
                className="border-b-2"
              >
                <TableRow>
                  <TableHead className="w-[160px]">
                    <button
                      onClick={() => {
                        setSortField('sent_at');
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-foreground font-medium"
                    >
                      <Calendar className="h-4 w-4" />
                      Sent At
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    <button
                      onClick={() => {
                        setSortField('participant_email');
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-foreground font-medium"
                    >
                      Recipient
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[250px]">Subject</TableHead>
                  <TableHead className="min-w-[180px]">Campaign</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[110px]">
                    <button
                      onClick={() => {
                        setSortField('status');
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-foreground font-medium"
                    >
                      Status
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[160px]">Activity</TableHead>
                </TableRow>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading email history...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Mail className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                          ? 'No emails match your filters'
                          : 'No emails sent yet'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {formatDateTime(log.sent_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.participant_name}</div>
                          <div className="text-xs text-muted-foreground">{log.participant_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={log.subject}>
                        {log.subject}
                      </TableCell>
                      <TableCell className="text-sm">{log.template_name}</TableCell>
                      <TableCell>{getTypeBadge(log.email_type)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(log)}
                          {log.status === 'failed' && log.error_message && (
                            <div className="flex items-start gap-1 text-xs text-error mt-1">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{log.error_message}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {log.opened_at ? (
                            <div className="flex items-center gap-1 text-info">
                              <Eye className="h-3 w-3" />
                              <span>{formatDateTime(log.opened_at)}</span>
                            </div>
                          ) : log.status === 'sent' ? (
                            <div className="text-muted-foreground italic">
                              Not opened yet
                            </div>
                          ) : null}
                          {log.clicked_at && (
                            <div className="flex items-center gap-1 text-primary-600">
                              <MousePointerClick className="h-3 w-3" />
                              <span>{formatDateTime(log.clicked_at)}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredLogs.length)} of {filteredLogs.length} emails
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
