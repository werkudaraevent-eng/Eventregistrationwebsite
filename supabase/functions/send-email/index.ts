// Supabase Edge Function for sending emails with configurable providers
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailRequest {
  to: string
  subject: string
  html: string
  participantId?: string
  templateId?: string
  attachments?: string[] // Array of attachment URLs or QRDATA: markers
}

interface EmailConfig {
  provider: 'gmail' | 'smtp' | 'sendgrid' | 'mailgun'
  gmail_email?: string
  gmail_app_password?: string
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string
  smtp_secure?: boolean
  sendgrid_api_key?: string
  mailgun_api_key?: string
  mailgun_domain?: string
  sender_email: string
  sender_name: string
}

// Helper function to generate QR code as PNG using external API with better error handling
async function generateQRCode(data: string): Promise<Uint8Array> {
  console.log('[QR] Generating QR code for:', data);
  
  // Use external API with proper error handling
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(data)}`;
  console.log('[QR] API URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    });
    
    console.log('[QR] API Response status:', response.status);
    console.log('[QR] API Response content-type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`QR API returned ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    console.log('[QR] Generated QR code from API, size:', bytes.length, 'bytes');
    console.log('[QR] First 8 bytes (PNG signature check):', Array.from(bytes.slice(0, 8)));
    
    // Verify minimum size (600x600 PNG should be > 3KB)
    if (bytes.length < 3000) {
      console.error('[QR] QR code too small, might be invalid. First 200 bytes:', Array.from(bytes.slice(0, 200)));
      throw new Error(`QR code too small (${bytes.length} bytes), expected > 3000 bytes`);
    }
    
    // Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
      console.error('[QR] Invalid PNG signature. Received:', bytes.slice(0, 100));
      throw new Error('QR code response is not a valid PNG file');
    }
    
    console.log('[QR] ✅ Valid PNG generated, size:', bytes.length, 'bytes');
    return bytes;
    
  } catch (error) {
    console.error('[QR] Failed to generate QR code:', error);
    throw error;
  }
}

// Helper function to get participant name from database
async function getParticipantName(participantId: string): Promise<string> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('participants')
      .select('name')
      .eq('id', participantId)
      .single();
    
    if (error || !data) {
      console.error('[Participant] Failed to fetch participant name:', error);
      return participantId; // Fallback to ID
    }
    
    return data.name || participantId;
  } catch (error) {
    console.error('[Participant] Error getting participant name:', error);
    return participantId;
  }
}

// Helper function to send via SMTP
async function sendViaSMTP(config: EmailConfig, to: string, subject: string, html: string, attachmentUrls?: string[], participantId?: string) {
  console.log('[SMTP] Connecting to:', config.smtp_host, 'port:', config.smtp_port);
  console.log('[SMTP] Username:', config.smtp_username);
  console.log('[SMTP] Secure mode:', config.smtp_secure);
  console.log('[SMTP] Attachments:', attachmentUrls?.length || 0);
  
  try {
    // Gmail uses port 587 with STARTTLS
    const isGmail = config.smtp_host === 'smtp.gmail.com';
    const usePort = config.smtp_port || 587;
    
    console.log('[SMTP] Creating client with hostname:', config.smtp_host);
    console.log('[SMTP] Port:', usePort);
    console.log('[SMTP] Is Gmail:', isGmail);
    
    const client = new SMTPClient({
      connection: {
        hostname: config.smtp_host!,
        port: usePort,
        tls: config.smtp_secure || false,
        auth: {
          username: config.smtp_username!,
          password: config.smtp_password!,
        },
      },
    });

    console.log('[SMTP] Client created, preparing email...');
    
    // Prepare email data
    const emailData: any = {
      from: `${config.sender_name} <${config.sender_email}>`,
      to: to,
      subject: subject,
      content: 'auto',
      html: html,
    };
    
    // Handle attachments if provided
    if (attachmentUrls && attachmentUrls.length > 0) {
      console.log('[SMTP] Processing attachments...');
      const attachments = [];
      
      for (const url of attachmentUrls) {
        try {
          let bytes: Uint8Array;
          let filename: string;
          let contentType: string;
          
          // Check if this is a QR code marker
          if (url.startsWith('QR:')) {
            const participantId = url.substring(3);
            console.log('[SMTP] Generating QR code for participant:', participantId);
            
            bytes = await generateQRCode(participantId);
            filename = `QR-${participantId}.png`;
            contentType = 'image/png';
            
            console.log('[SMTP] QR code generated:', filename, 'Size:', bytes.length, 'bytes');
          } else if (url.startsWith('QRDATA:')) {
            // Handle QR code data URL from frontend
            // Format: QRDATA:participantId:data:image/png;base64,iVBORw0KG...
            const qrDataPrefix = 'QRDATA:';
            const withoutPrefix = url.substring(qrDataPrefix.length);
            
            // Find first occurrence of 'data:' to split participant ID and data URL
            const dataUrlStart = withoutPrefix.indexOf('data:');
            if (dataUrlStart === -1) {
              console.error('[SMTP] Invalid QRDATA format - no data URL found');
              continue;
            }
            
            const participantId = withoutPrefix.substring(0, dataUrlStart - 1); // -1 to remove trailing ':'
            const dataUrl = withoutPrefix.substring(dataUrlStart);
            
            console.log('[SMTP] Processing QR code data URL for participant:', participantId);
            console.log('[SMTP] Data URL prefix:', dataUrl.substring(0, 50) + '...');
            
            // Extract base64 data from data URL (format: data:image/png;base64,...)
            const base64Match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
            if (!base64Match) {
              console.error('[SMTP] Invalid data URL format:', dataUrl.substring(0, 100));
              continue;
            }
            
            const base64Data = base64Match[1];
            console.log('[SMTP] Base64 data length:', base64Data.length);
            
            // Convert base64 to bytes using Deno's built-in decoder
            try {
              const decoder = new TextDecoder();
              const binaryStr = atob(base64Data);
              bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              
              filename = `QR-${participantId}.png`;
              contentType = 'image/png';
              
              // Verify PNG signature
              if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
                console.error('[SMTP] Invalid PNG signature after decode. First 8 bytes:', Array.from(bytes.slice(0, 8)));
                console.error('[SMTP] Base64 start:', base64Data.substring(0, 50));
                continue;
              }
              
              console.log('[SMTP] ✅ Valid PNG from data URL:', filename, 'Size:', bytes.length, 'bytes');
            } catch (decodeError) {
              console.error('[SMTP] Failed to decode base64:', decodeError);
              continue;
            }
          } else {
            // Regular URL attachment
            console.log('[SMTP] Fetching attachment:', url);
            
            // Check if this is a QR code from Supabase Storage
            const isQRCode = url.includes('/participant-qr-codes/') || url.includes('qr-code');
            
            const response = await fetch(url);
            if (!response.ok) {
              console.error('[SMTP] Failed to fetch attachment:', url, 'Status:', response.status);
              continue;
            }
            
            const arrayBuffer = await response.arrayBuffer();
            bytes = new Uint8Array(arrayBuffer);
            
            // Get Content-Type from response headers
            contentType = response.headers.get('content-type') || 'application/octet-stream';
            
            // Determine filename
            if (isQRCode && participantId) {
              // For QR codes, use participant name
              const participantName = await getParticipantName(participantId);
              // Sanitize filename (remove special characters)
              const safeName = participantName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');
              filename = `QR_${safeName}.png`;
              console.log('[SMTP] QR code attachment for participant:', participantName, '→', filename);
            } else {
              // For regular attachments, try to get original filename
              let extractedFilename = '';
              
              // First try Content-Disposition header
              const contentDisposition = response.headers.get('content-disposition');
              if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                  extractedFilename = filenameMatch[1].replace(/['"]/g, '');
                }
              }
              
              // If no Content-Disposition, try to extract from URL
              if (!extractedFilename) {
                const urlParts = url.split('/');
                const urlFilename = urlParts[urlParts.length - 1].split('?')[0];
                
                // Remove timestamp prefix (format: timestamp_randomstring_originalname.ext)
                // Try to extract original filename after timestamp
                if (urlFilename.includes('_')) {
                  const parts = urlFilename.split('_');
                  // If first part is timestamp (all digits), skip it and random string
                  if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
                    extractedFilename = parts.slice(2).join('_'); // Get original filename
                  } else {
                    extractedFilename = urlFilename;
                  }
                } else {
                  extractedFilename = urlFilename;
                }
              }
              
              filename = extractedFilename && extractedFilename.length > 0 ? extractedFilename : 'attachment';
              
              // Add extension based on content type if missing
              if (!filename.includes('.')) {
                if (contentType.includes('image/png')) filename += '.png';
                else if (contentType.includes('image/jpeg')) filename += '.jpg';
                else if (contentType.includes('application/pdf')) filename += '.pdf';
              }
              
              console.log('[SMTP] Regular attachment:', filename);
            }
          }
          
          // Convert Uint8Array to base64 string for denomailer
          const base64Content = btoa(String.fromCharCode(...bytes));
          
          attachments.push({
            filename: filename,
            content: base64Content,
            contentType: contentType,
            encoding: 'base64',
          });
          
          console.log('[SMTP] Attachment added:', filename, 'Type:', contentType, 'Size:', bytes.length, 'bytes', 'Base64 length:', base64Content.length);
        } catch (err) {
          console.error('[SMTP] Error processing attachment:', url, err);
        }
      }
      
      if (attachments.length > 0) {
        emailData.attachments = attachments;
        console.log('[SMTP] Total attachments:', attachments.length);
      }
    }

    console.log('[SMTP] Sending email...');
    await client.send(emailData);

    console.log('[SMTP] Email sent, closing connection...');
    await client.close();
    console.log('[SMTP] Connection closed successfully');
  } catch (error: any) {
    console.error('[SMTP] Full error object:', JSON.stringify(error, null, 2));
    console.error('[SMTP] Error message:', error?.message);
    console.error('[SMTP] Error stack:', error?.stack);
    throw new Error(`SMTP Error: ${error?.message || String(error)}`);
  }
}

// Helper function to send via SendGrid
async function sendViaSendGrid(config: EmailConfig, to: string, subject: string, html: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.sendgrid_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: to }],
        subject: subject,
      }],
      from: {
        email: config.sender_email,
        name: config.sender_name
      },
      content: [{
        type: 'text/html',
        value: html
      }],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
  }
}

// Helper function to send via Mailgun
async function sendViaMailgun(config: EmailConfig, to: string, subject: string, html: string) {
  const formData = new FormData()
  formData.append('from', `${config.sender_name} <${config.sender_email}>`)
  formData.append('to', to)
  formData.append('subject', subject)
  formData.append('html', html)

  const response = await fetch(
    `https://api.mailgun.net/v3/${config.mailgun_domain}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${config.mailgun_api_key}`)}`
      },
      body: formData
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Mailgun API error: ${response.status} - ${errorText}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 send-email Edge Function v2.0 - QR Generation Enabled');
    
    // Get email configuration from database
    console.log('[send-email] Getting active email config from database...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // UPDATED: Query hanya by is_active, tanpa filter id='default'
    // Karena sekarang support multiple configs dengan ID random
    const { data: config, error: configError } = await supabase
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .single()

    console.log('[send-email] Config query result:', { config, configError });

    if (configError) {
      console.error('[send-email] Config error:', configError);
      throw new Error(`Email configuration error: ${configError.message}`);
    }
    
    if (!config) {
      throw new Error('No active email configuration found. Please activate a configuration in Email Settings.')
    }

    console.log('[send-email] Active config loaded. Provider:', config.provider, 'ID:', config.id);

    const { to, subject, html, participantId, templateId, attachments }: EmailRequest = await req.json()
    
    console.log('[send-email] Request params:', {
      to,
      participantId,
      templateId,
      attachments: attachments?.length || 0,
      attachmentTypes: attachments?.map(a => a.startsWith('QRDATA:') ? 'QR_DATA' : a.startsWith('http') ? 'URL' : 'OTHER')
    });

    // Validate input
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email format: ${to}`)
    }
    
    // Use attachments directly (QR codes are already in QRDATA: format from frontend)
    const attachmentUrls = attachments || [];
    
    console.log('[send-email] Processing', attachmentUrls.length, 'attachments');

    console.log(`📧 Sending email to: ${to} via ${config.provider}`)

    // Send email based on provider
    switch (config.provider) {
      case 'gmail':
        console.log('[send-email] Gmail provider selected');
        console.log('[send-email] Gmail email:', config.gmail_email);
        console.log('[send-email] Gmail app password exists:', !!config.gmail_app_password);
        
        if (!config.gmail_email || !config.gmail_app_password) {
          const missing = [];
          if (!config.gmail_email) missing.push('gmail_email');
          if (!config.gmail_app_password) missing.push('gmail_app_password');
          throw new Error(`Gmail configuration incomplete. Missing: ${missing.join(', ')}`);
        }
        
        // Gmail uses SMTP with port 465 (TLS) - denomailer works better with direct TLS than STARTTLS
        console.log('[send-email] Creating Gmail SMTP config with port 465 (TLS)...');
        const gmailConfig: EmailConfig = {
          ...config,
          smtp_host: 'smtp.gmail.com',
          smtp_port: 465,
          smtp_username: config.gmail_email,
          smtp_password: config.gmail_app_password,
          smtp_secure: true, // Use direct TLS on port 465
        };
        
        console.log('[send-email] Gmail SMTP config created:', {
          smtp_host: gmailConfig.smtp_host,
          smtp_port: gmailConfig.smtp_port,
          smtp_username: gmailConfig.smtp_username,
          has_password: !!gmailConfig.smtp_password
        });
        
        await sendViaSMTP(gmailConfig, to, subject, html, attachments, participantId)
        break

      case 'smtp':
        if (!config.smtp_host || !config.smtp_username || !config.smtp_password) {
          const missing = [];
          if (!config.smtp_host) missing.push('smtp_host');
          if (!config.smtp_username) missing.push('smtp_username');
          if (!config.smtp_password) missing.push('smtp_password');
          throw new Error(`SMTP configuration incomplete. Missing: ${missing.join(', ')}`);
        }
        await sendViaSMTP(config, to, subject, html, attachments, participantId)
        break

      case 'sendgrid':
        if (!config.sendgrid_api_key) {
          throw new Error('SendGrid API key not configured')
        }
        await sendViaSendGrid(config, to, subject, html)
        break

      case 'mailgun':
        if (!config.mailgun_api_key || !config.mailgun_domain) {
          throw new Error('Mailgun configuration incomplete')
        }
        await sendViaMailgun(config, to, subject, html)
        break

      default:
        throw new Error(`Unsupported email provider: ${config.provider}`)
    }

    console.log(`✅ Email sent successfully to: ${to}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        participantId,
        templateId,
        sentTo: to 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || String(error),
        errorDetails: {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        }
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
