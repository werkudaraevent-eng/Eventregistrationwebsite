// Supabase Edge Function for sending emails via SendGrid
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@yourdomain.com'
const SENDER_NAME = Deno.env.get('SENDER_NAME') || 'Event Registration System'

interface EmailRequest {
  to: string
  subject: string
  html: string
  participantId?: string
  templateId?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API Key
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured')
    }

    const { to, subject, html, participantId, templateId }: EmailRequest = await req.json()

    // Validate input
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email format: ${to}`)
    }

    console.log(`📧 Sending email to: ${to}`)

    // Send via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
        }],
        from: {
          email: SENDER_EMAIL,
          name: SENDER_NAME
        },
        content: [{
          type: 'text/html',
          value: html
        }],
        // Optional: Add tracking
        tracking_settings: {
          click_tracking: {
            enable: true
          },
          open_tracking: {
            enable: true
          }
        }
      })
    })

    // Check response
    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid error:', errorText)
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
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

  } catch (error) {
    console.error('❌ Error sending email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
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
