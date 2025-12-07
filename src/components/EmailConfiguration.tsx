import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Mail, Server, Key, Globe, Settings } from 'lucide-react';

interface EmailConfig {
  id: string;
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
}

export function EmailConfiguration() {
  const [config, setConfig] = useState<EmailConfig>({
    id: 'default',
    provider: 'smtp',
    sender_email: '',
    sender_name: 'Event Registration System',
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('email_config')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error) {
        // Table mungkin belum ada, set default config
        console.log('Email config not found, using defaults:', error);
        setMessage({ 
          type: 'error', 
          text: 'Email configuration table not found. Please run database migration first.' 
        });
        return;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading email config:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load email configuration. Please run database migration first.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    console.log('[EmailConfiguration] Save button clicked');
    console.log('[EmailConfiguration] Current config:', config);
    
    setSaving(true);
    setMessage(null);

    try {
      console.log('[EmailConfiguration] Attempting to save to Supabase...');
      
      // Prepare update object - clear unused provider fields
      const updateData: any = {
        provider: config.provider,
        sender_email: config.sender_email,
        sender_name: config.sender_name,
        is_active: config.is_active,
      };

      // Only include fields for active provider, null out others
      switch (config.provider) {
        case 'gmail':
          updateData.gmail_email = config.gmail_email;
          updateData.gmail_app_password = config.gmail_app_password;
          // Clear other providers
          updateData.smtp_host = null;
          updateData.smtp_port = null;
          updateData.smtp_username = null;
          updateData.smtp_password = null;
          updateData.smtp_secure = false;
          updateData.sendgrid_api_key = null;
          updateData.mailgun_api_key = null;
          updateData.mailgun_domain = null;
          break;
        case 'smtp':
          updateData.smtp_host = config.smtp_host;
          updateData.smtp_port = config.smtp_port;
          updateData.smtp_username = config.smtp_username;
          updateData.smtp_password = config.smtp_password;
          updateData.smtp_secure = config.smtp_secure;
          // Clear other providers
          updateData.gmail_email = null;
          updateData.gmail_app_password = null;
          updateData.sendgrid_api_key = null;
          updateData.mailgun_api_key = null;
          updateData.mailgun_domain = null;
          break;
        case 'sendgrid':
          updateData.sendgrid_api_key = config.sendgrid_api_key;
          // Clear other providers
          updateData.gmail_email = null;
          updateData.gmail_app_password = null;
          updateData.smtp_host = null;
          updateData.smtp_port = null;
          updateData.smtp_username = null;
          updateData.smtp_password = null;
          updateData.smtp_secure = false;
          updateData.mailgun_api_key = null;
          updateData.mailgun_domain = null;
          break;
        case 'mailgun':
          updateData.mailgun_api_key = config.mailgun_api_key;
          updateData.mailgun_domain = config.mailgun_domain;
          // Clear other providers
          updateData.gmail_email = null;
          updateData.gmail_app_password = null;
          updateData.smtp_host = null;
          updateData.smtp_port = null;
          updateData.smtp_username = null;
          updateData.smtp_password = null;
          updateData.smtp_secure = false;
          updateData.sendgrid_api_key = null;
          break;
      }
      
      const { data, error } = await supabase
        .from('email_config')
        .update(updateData)
        .eq('id', 'default');

      console.log('[EmailConfiguration] Supabase response:', { data, error });

      if (error) throw error;

      setMessage({ type: 'success', text: '✅ Email configuration saved successfully!' });
      console.log('[EmailConfiguration] Save successful!');
    } catch (error: any) {
      console.error('[EmailConfiguration] Error saving email config:', error);
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const testEmailConfig = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Test Email from Event Registration System',
          html: `
            <h1>🎉 Email Configuration Test</h1>
            <p>This is a test email to verify your email configuration.</p>
            <p><strong>Provider:</strong> ${config.provider.toUpperCase()}</p>
            <p><strong>Sender:</strong> ${config.sender_name} (${config.sender_email})</p>
            <p>If you received this email, your configuration is working correctly!</p>
          `,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Test email sent successfully to ${testEmail}! Check your inbox.` 
        });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error testing email:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to send test email: ${error.message}` 
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">Configure your email service provider</p>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sender_name">Sender Name</Label>
            <Input
              id="sender_name"
              value={config.sender_name}
              onChange={(e) => setConfig({ ...config, sender_name: e.target.value })}
              placeholder="Event Registration System"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender_email">Sender Email</Label>
            <Input
              id="sender_email"
              type="email"
              value={config.sender_email}
              onChange={(e) => setConfig({ ...config, sender_email: e.target.value })}
              placeholder="noreply@yourdomain.com"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={config.is_active}
              onCheckedChange={(checked: boolean) => setConfig({ ...config, is_active: checked })}
            />
            <Label htmlFor="is_active">Email service active</Label>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                saveConfig();
              }} 
              disabled={saving} 
              className="gradient-primary hover:opacity-90 text-white shadow-lg"
            >
              {saving ? 'Saving...' : '💾 Save General Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Provider</CardTitle>
              <CardDescription>Choose and configure your email service provider</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={config.provider} onValueChange={(value: string) => setConfig({ ...config, provider: value as 'gmail' | 'smtp' | 'sendgrid' | 'mailgun' })}>
            <TabsList className="!grid !w-full grid-cols-4 !h-auto gap-2 !flex-none">
              <TabsTrigger value="gmail" className="flex items-center justify-center">
                <Mail className="h-4 w-4 mr-2" />
                Gmail
              </TabsTrigger>
              <TabsTrigger value="smtp" className="flex items-center justify-center">
                <Server className="h-4 w-4 mr-2" />
                SMTP
              </TabsTrigger>
              <TabsTrigger value="sendgrid" className="flex items-center justify-center">
                <Key className="h-4 w-4 mr-2" />
                SendGrid
              </TabsTrigger>
              <TabsTrigger value="mailgun" className="flex items-center justify-center">
                <Globe className="h-4 w-4 mr-2" />
                Mailgun
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gmail" className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Gmail SMTP</strong> - Easiest option for testing. Free up to 500 emails/day.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gmail_email">Gmail Address</Label>
                <Input
                  id="gmail_email"
                  type="email"
                  value={config.gmail_email || ''}
                  onChange={(e) => setConfig({ ...config, gmail_email: e.target.value })}
                  placeholder="your-email@gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gmail_app_password">Gmail App Password</Label>
                <Input
                  id="gmail_app_password"
                  type="password"
                  value={config.gmail_app_password || ''}
                  onChange={(e) => setConfig({ ...config, gmail_app_password: e.target.value })}
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
                  {' '}(requires 2-Step Verification)
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Important:</strong> You must use an App Password, not your regular Gmail password. 
                  Enable 2-Step Verification first, then generate an App Password.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="smtp" className="space-y-4 mt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-800">
                  <strong>Generic SMTP</strong> - Use any email hosting provider (cPanel, Plesk, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_host">SMTP Host</Label>
                <Input
                  id="smtp_host"
                  value={config.smtp_host || ''}
                  onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                  placeholder="mail.yourdomain.com"
                />
                <p className="text-sm text-muted-foreground">
                  Example: mail.yourdomain.com
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={config.smtp_port || 587}
                  onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                  placeholder="587"
                />
                <p className="text-sm text-muted-foreground">
                  Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_username">SMTP Username</Label>
                <Input
                  id="smtp_username"
                  value={config.smtp_username || ''}
                  onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
                  placeholder="your-email@domain.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_password">SMTP Password</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  value={config.smtp_password || ''}
                  onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                  placeholder="••••••••"
                />
                <p className="text-sm text-muted-foreground">
                  For Gmail, use App Password from Google Account settings
                </p>
              </div>
            </TabsContent>

            <TabsContent value="sendgrid" className="space-y-4 mt-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  <strong>SendGrid API</strong> - Reliable email delivery service. Free tier: 100 emails/day.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sendgrid_api_key">SendGrid API Key</Label>
                <Input
                  id="sendgrid_api_key"
                  type="password"
                  value={config.sendgrid_api_key || ''}
                  onChange={(e) => setConfig({ ...config, sendgrid_api_key: e.target.value })}
                  placeholder="SG.••••••••••••••"
                />
                <p className="text-sm text-muted-foreground">
                  Get your API key from{' '}
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800">
                  <strong>📝 Setup:</strong> Sign up at sendgrid.com → Create API Key with "Full Access" → Paste here
                </p>
              </div>
            </TabsContent>

            <TabsContent value="mailgun" className="space-y-4 mt-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800">
                  <strong>Mailgun API</strong> - Developer-friendly email API. Free tier: 5,000 emails/month (3 months).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mailgun_domain">Mailgun Domain</Label>
                <Input
                  id="mailgun_domain"
                  value={config.mailgun_domain || ''}
                  onChange={(e) => setConfig({ ...config, mailgun_domain: e.target.value })}
                  placeholder="mg.yourdomain.com"
                />
                <p className="text-sm text-muted-foreground">
                  Your verified domain in Mailgun
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mailgun_api_key">Mailgun API Key</Label>
                <Input
                  id="mailgun_api_key"
                  type="password"
                  value={config.mailgun_api_key || ''}
                  onChange={(e) => setConfig({ ...config, mailgun_api_key: e.target.value })}
                  placeholder="key-••••••••••••••"
                />
                <p className="text-sm text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://app.mailgun.com/app/account/security/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Mailgun Dashboard
                  </a>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800">
                  <strong>📝 Setup:</strong> Sign up at mailgun.com → Add & verify your domain → Get API Key → Paste here
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-6 border-t mt-6">
            <Button 
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                saveConfig();
              }} 
              disabled={saving} 
              size="lg" 
              className="gradient-primary hover:opacity-90 text-white shadow-lg"
            >
              {saving ? 'Saving...' : '🔧 Save Provider Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Test Email Configuration
          </CardTitle>
          <CardDescription>Send a test email to verify your configuration</CardDescription>
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
            <Button onClick={testEmailConfig} disabled={testing || !config.is_active}>
              {testing ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Make sure to save your configuration before testing
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
