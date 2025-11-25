import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  Mail, Server, Key, Globe, Settings, Plus, Trash2, 
  CheckCircle, XCircle, Copy, Edit, Power 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
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

interface EmailConfig {
  id: string;
  config_name: string;
  provider: 'gmail' | 'smtp' | 'sendgrid' | 'mailgun';
  
  // Gmail Settings (using SMTP)
  gmail_email?: string;
  gmail_app_password?: string;
  
  // Generic SMTP Settings
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  
  // SendGrid API
  sendgrid_api_key?: string;
  
  // Mailgun API
  mailgun_api_key?: string;
  mailgun_domain?: string;
  
  // General
  sender_email: string;
  sender_name: string;
  is_active: boolean;
  
  // Testing metadata
  last_tested_at?: string;
  last_test_status?: 'success' | 'failed';
  last_test_error?: string;
  
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_CONFIG: Partial<EmailConfig> = {
  config_name: 'New Configuration',
  provider: 'gmail',
  sender_name: 'Event Registration System',
  sender_email: '',
  is_active: false,
  smtp_secure: false,  // Default to false (port 587/TLS)
  smtp_port: 587,      // Default port
};

export function EmailConfigurationV2() {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<EmailConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_config')
        .select('*')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[EmailConfigV2] Load error:', error);
        // Check if table doesn't exist or column missing
        if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          setMessage({ 
            type: 'error', 
            text: '⚠️ Database not upgraded. Please run UPGRADE_EMAIL_CONFIG_SAFE.sql in Supabase SQL Editor.' 
          });
        } else {
          throw error;
        }
        return;
      }

      setConfigs(data || []);
      
      // Set active config as selected
      const activeConfig = data?.find(c => c.is_active);
      if (activeConfig) {
        setSelectedConfig(activeConfig);
      } else if (data && data.length > 0) {
        setSelectedConfig(data[0]);
      }
    } catch (error: any) {
      console.error('[EmailConfigV2] Error loading configs:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to load: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewConfig = () => {
    const newConfig: EmailConfig = {
      id: '',
      ...DEFAULT_CONFIG,
    } as EmailConfig;
    
    setEditingConfig(newConfig);
    setShowNewDialog(true);
  };

  const duplicateConfig = async (sourceConfig: EmailConfig) => {
    try {
      console.log('[EmailConfigV2] Duplicating config:', sourceConfig.id);
      
      const { data, error } = await supabase.rpc('duplicate_email_config', {
        source_config_id: sourceConfig.id,
        new_name: `${sourceConfig.config_name} (Copy)`,
      });

      console.log('[EmailConfigV2] Duplicate response:', { data, error });

      if (error) {
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('Database function missing. Please run UPGRADE_EMAIL_CONFIG_SAFE.sql');
        }
        throw error;
      }

      setMessage({ 
        type: 'success', 
        text: '✅ Configuration duplicated successfully!' 
      });
      
      await loadConfigs();
    } catch (error: any) {
      console.error('[EmailConfigV2] Error duplicating config:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to duplicate: ${error.message || 'Unknown error'}` 
      });
    }
  };

  const saveConfig = async (config: EmailConfig) => {
    setSaving(true);
    setMessage(null);

    try {
      // Prepare update object
      const saveData: any = {
        config_name: config.config_name,
        provider: config.provider,
        sender_email: config.sender_email,
        sender_name: config.sender_name,
        is_active: false, // Never activate on save, use setActiveConfig for that
      };

      // Only include fields for active provider, null out others
      switch (config.provider) {
        case 'gmail':
          saveData.gmail_email = config.gmail_email;
          saveData.gmail_app_password = config.gmail_app_password;
          saveData.smtp_host = null;
          saveData.smtp_port = null;
          saveData.smtp_username = null;
          saveData.smtp_password = null;
          saveData.smtp_secure = false;
          saveData.sendgrid_api_key = null;
          saveData.mailgun_api_key = null;
          saveData.mailgun_domain = null;
          break;
        case 'smtp':
          saveData.smtp_host = config.smtp_host;
          saveData.smtp_port = config.smtp_port;
          saveData.smtp_username = config.smtp_username;
          saveData.smtp_password = config.smtp_password;
          saveData.smtp_secure = config.smtp_secure;
          saveData.gmail_email = null;
          saveData.gmail_app_password = null;
          saveData.sendgrid_api_key = null;
          saveData.mailgun_api_key = null;
          saveData.mailgun_domain = null;
          break;
        case 'sendgrid':
          saveData.sendgrid_api_key = config.sendgrid_api_key;
          saveData.gmail_email = null;
          saveData.gmail_app_password = null;
          saveData.smtp_host = null;
          saveData.smtp_port = null;
          saveData.smtp_username = null;
          saveData.smtp_password = null;
          saveData.smtp_secure = false;
          saveData.mailgun_api_key = null;
          saveData.mailgun_domain = null;
          break;
        case 'mailgun':
          saveData.mailgun_api_key = config.mailgun_api_key;
          saveData.mailgun_domain = config.mailgun_domain;
          saveData.gmail_email = null;
          saveData.gmail_app_password = null;
          saveData.smtp_host = null;
          saveData.smtp_port = null;
          saveData.smtp_username = null;
          saveData.smtp_password = null;
          saveData.smtp_secure = false;
          saveData.sendgrid_api_key = null;
          break;
      }

      if (config.id) {
        // Update existing
        const { error } = await supabase
          .from('email_config')
          .update(saveData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('email_config')
          .insert([saveData])
          .select()
          .single();

        if (error) throw error;
        config.id = data.id;
      }

      setMessage({ type: 'success', text: '✅ Configuration saved successfully!' });
      setShowNewDialog(false);
      setEditingConfig(null);
      await loadConfigs();
    } catch (error: any) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const setActiveConfig = async (configId: string) => {
    try {
      console.log('[EmailConfigV2] Setting active config:', configId);
      
      const { data, error } = await supabase.rpc('set_active_email_config', {
        config_id: configId,
      });

      console.log('[EmailConfigV2] RPC response:', { data, error });

      if (error) {
        // Check if function doesn't exist
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('Database function missing. Please run UPGRADE_EMAIL_CONFIG_SAFE.sql');
        }
        throw error;
      }

      setMessage({ 
        type: 'success', 
        text: '✅ Active configuration updated!' 
      });
      
      await loadConfigs();
    } catch (error: any) {
      console.error('[EmailConfigV2] Error setting active config:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to activate: ${error.message || 'Unknown error'}` 
      });
    }
  };

  const deleteConfig = async (configId: string) => {
    try {
      const { error } = await supabase
        .from('email_config')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: '✅ Configuration deleted successfully!' 
      });
      
      setDeleteConfirmId(null);
      await loadConfigs();
    } catch (error: any) {
      console.error('Error deleting config:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to delete: ${error.message}` 
      });
    }
  };

  const testEmailConfig = async (config: EmailConfig) => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      // Temporarily set this config as active for testing
      await supabase.rpc('set_active_email_config', { config_id: config.id });
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Test Email from Event Registration System',
          html: `
            <h1>🎉 Email Configuration Test</h1>
            <p>This is a test email to verify your email configuration.</p>
            <p><strong>Config:</strong> ${config.config_name}</p>
            <p><strong>Provider:</strong> ${config.provider.toUpperCase()}</p>
            <p><strong>Sender:</strong> ${config.sender_name} (${config.sender_email})</p>
            <p>If you received this email, your configuration is working correctly!</p>
          `,
        },
      });

      if (error) throw error;

      // Update test status
      await supabase
        .from('email_config')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: data?.success ? 'success' : 'failed',
          last_test_error: data?.error || null,
        })
        .eq('id', config.id);

      if (data?.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Test email sent successfully to ${testEmail}! Check your inbox.` 
        });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }

      await loadConfigs();
    } catch (error: any) {
      console.error('Error testing email:', error);
      
      // Update failed test status
      await supabase
        .from('email_config')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_status: 'failed',
          last_test_error: error.message,
        })
        .eq('id', config.id);
      
      setMessage({ 
        type: 'error', 
        text: `Failed to send test email: ${error.message}` 
      });
      
      await loadConfigs();
    } finally {
      setTesting(false);
    }
  };

  const renderProviderForm = (config: EmailConfig, onChange: (updated: EmailConfig) => void) => {
    switch (config.provider) {
      case 'gmail':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Gmail SMTP</strong> - Easiest option for testing. Free up to 500 emails/day.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Gmail Address</Label>
              <Input
                type="email"
                value={config.gmail_email || ''}
                onChange={(e) => onChange({ ...config, gmail_email: e.target.value })}
                placeholder="your-email@gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Gmail App Password</Label>
              <Input
                type="password"
                value={config.gmail_app_password || ''}
                onChange={(e) => onChange({ ...config, gmail_app_password: e.target.value })}
                placeholder="16-character app password"
              />
              <p className="text-sm text-muted-foreground">
                Get your App Password from{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Account Settings
                </a>
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Important:</strong> You must use an App Password, not your regular Gmail password.
              </p>
            </div>
          </div>
        );

      case 'smtp':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-800">
                <strong>Generic SMTP</strong> - Use any email hosting provider
              </p>
            </div>

            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={config.smtp_host || ''}
                onChange={(e) => onChange({ ...config, smtp_host: e.target.value })}
                placeholder="mail.yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">
                Example: mail.yourdomain.com, smtp.gmail.com, uranus.webmail.co.id
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input
                  type="number"
                  value={config.smtp_port || 587}
                  onChange={(e) => onChange({ ...config, smtp_port: parseInt(e.target.value) })}
                  placeholder="587"
                />
                <p className="text-xs text-muted-foreground">
                  Common: 465 (SSL), 587 (TLS)
                </p>
              </div>

              <div className="space-y-2">
                <Label>SMTP Secure (SSL/TLS)</Label>
                <div className="flex items-center space-x-3 h-10 px-3 border rounded-md bg-background">
                  <Switch
                    id="smtp_secure"
                    checked={config.smtp_secure || false}
                    onCheckedChange={(checked) => onChange({ ...config, smtp_secure: checked })}
                  />
                  <Label htmlFor="smtp_secure" className="cursor-pointer font-normal">
                    {config.smtp_secure ? 'ON (SSL - Port 465)' : 'OFF (TLS - Port 587)'}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {config.smtp_secure 
                    ? '✅ Use for port 465' 
                    : '✅ Use for port 587'}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>💡 Quick Guide:</strong><br/>
                • Port <strong>465</strong> → SMTP Secure <strong>ON</strong> (SSL/TLS from start)<br/>
                • Port <strong>587</strong> → SMTP Secure <strong>OFF</strong> (STARTTLS - upgrades to TLS)<br/>
                • Port <strong>25</strong> → SMTP Secure <strong>OFF</strong> (often blocked by ISP)
              </p>
            </div>

            <div className="space-y-2">
              <Label>SMTP Username</Label>
              <Input
                value={config.smtp_username || ''}
                onChange={(e) => onChange({ ...config, smtp_username: e.target.value })}
                placeholder="your-email@domain.com"
              />
            </div>

            <div className="space-y-2">
              <Label>SMTP Password</Label>
              <Input
                type="password"
                value={config.smtp_password || ''}
                onChange={(e) => onChange({ ...config, smtp_password: e.target.value })}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Your email account password or app-specific password
              </p>
            </div>
          </div>
        );

      case 'sendgrid':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>SendGrid API</strong> - Free tier: 100 emails/day
              </p>
            </div>

            <div className="space-y-2">
              <Label>SendGrid API Key</Label>
              <Input
                type="password"
                value={config.sendgrid_api_key || ''}
                onChange={(e) => onChange({ ...config, sendgrid_api_key: e.target.value })}
                placeholder="SG.••••••••••••••"
              />
              <p className="text-sm text-muted-foreground">
                Get from{' '}
                <a
                  href="https://app.sendgrid.com/settings/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  SendGrid Dashboard
                </a>
              </p>
            </div>
          </div>
        );

      case 'mailgun':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Mailgun API</strong> - Free: 5,000 emails/month
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mailgun Domain</Label>
              <Input
                value={config.mailgun_domain || ''}
                onChange={(e) => onChange({ ...config, mailgun_domain: e.target.value })}
                placeholder="mg.yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Mailgun API Key</Label>
              <Input
                type="password"
                value={config.mailgun_api_key || ''}
                onChange={(e) => onChange({ ...config, mailgun_api_key: e.target.value })}
                placeholder="key-••••••••••••••"
              />
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">Email Configurations</h2>
          <p className="text-muted-foreground">Manage multiple email providers</p>
        </div>
        <Button onClick={createNewConfig} className="bg-gradient-to-r from-purple-600 to-pink-600">
          <Plus className="h-4 w-4 mr-2" />
          New Configuration
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Saved Configurations List */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Configurations</CardTitle>
          <CardDescription>
            {configs.length === 0 
              ? 'No configurations yet. Create one to get started.'
              : 'Click to select, test, or manage your email providers'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`border rounded-lg p-4 transition-all ${
                  config.is_active 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{config.config_name}</h3>
                      {config.is_active && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {config.provider.toUpperCase()}
                      </Badge>
                      {config.last_test_status && (
                        <Badge 
                          variant={config.last_test_status === 'success' ? 'default' : 'destructive'}
                          className={config.last_test_status === 'success' ? 'bg-blue-500' : ''}
                        >
                          {config.last_test_status === 'success' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Tested ✓
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Test Failed
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.sender_name} &lt;{config.sender_email}&gt;
                    </p>
                    {config.last_tested_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last tested: {new Date(config.last_tested_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!config.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveConfig(config.id)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Power className="h-4 w-4 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedConfig(config);
                        setEditingConfig({ ...config });
                        setShowNewDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateConfig(config)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirmId(config.id)}
                      disabled={config.is_active}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Email Section */}
      {selectedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Test Configuration: {selectedConfig.config_name}
            </CardTitle>
            <CardDescription>Send a test email to verify this configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1"
              />
              <Button 
                onClick={() => testEmailConfig(selectedConfig)} 
                disabled={testing}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {testing ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This will temporarily activate this config for testing
            </p>
          </CardContent>
        </Card>
      )}

      {/* New/Edit Configuration Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig?.id ? 'Edit Configuration' : 'New Email Configuration'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig?.id ? 'Update your email provider settings' : 'Add a new email provider'}
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Configuration Name</Label>
                <Input
                  value={editingConfig.config_name}
                  onChange={(e) => setEditingConfig({ ...editingConfig, config_name: e.target.value })}
                  placeholder="My Email Config"
                />
              </div>

              <div className="space-y-2">
                <Label>Sender Name</Label>
                <Input
                  value={editingConfig.sender_name}
                  onChange={(e) => setEditingConfig({ ...editingConfig, sender_name: e.target.value })}
                  placeholder="Event Registration System"
                />
              </div>

              <div className="space-y-2">
                <Label>Sender Email</Label>
                <Input
                  type="email"
                  value={editingConfig.sender_email}
                  onChange={(e) => setEditingConfig({ ...editingConfig, sender_email: e.target.value })}
                  placeholder="noreply@yourdomain.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Provider</Label>
                <Tabs 
                  value={editingConfig.provider} 
                  onValueChange={(value) => setEditingConfig({ 
                    ...editingConfig, 
                    provider: value as EmailConfig['provider'] 
                  })}
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="gmail">
                      <Mail className="h-4 w-4 mr-2" />
                      Gmail
                    </TabsTrigger>
                    <TabsTrigger value="smtp">
                      <Server className="h-4 w-4 mr-2" />
                      SMTP
                    </TabsTrigger>
                    <TabsTrigger value="sendgrid">
                      <Key className="h-4 w-4 mr-2" />
                      SendGrid
                    </TabsTrigger>
                    <TabsTrigger value="mailgun">
                      <Globe className="h-4 w-4 mr-2" />
                      Mailgun
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    {renderProviderForm(editingConfig, setEditingConfig)}
                  </div>
                </Tabs>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingConfig && saveConfig(editingConfig)}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {saving ? 'Saving...' : (editingConfig?.id ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the email configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteConfig(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
