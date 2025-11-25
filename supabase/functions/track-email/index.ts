// Supabase Edge Function for tracking email opens
// PUBLIC ACCESS - No authentication required
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  console.log('[track-email] Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const url = new URL(req.url);
    const emailLogId = url.searchParams.get('id') || url.searchParams.get('_track');
    const participantId = url.searchParams.get('pid');
    const redirectUrl = url.searchParams.get('redirect');

    console.log('[track-email] Tracking - Log ID:', emailLogId, 'Participant ID:', participantId, 'Redirect:', redirectUrl);

    if (!emailLogId && !participantId) {
      console.log('[track-email] Missing tracking IDs');
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update participant_emails if we have log ID
    if (emailLogId) {
      console.log('[track-email] Attempting to update email log:', emailLogId);
      
      // First, check if record exists
      const { data: existingRecord, error: selectError } = await supabase
        .from('participant_emails')
        .select('id, opened_at, status')
        .eq('id', emailLogId)
        .single();

      console.log('[track-email] Existing record:', existingRecord);
      console.log('[track-email] Select error:', selectError);

      if (selectError) {
        console.error('[track-email] Error selecting email log:', selectError);
      } else if (existingRecord) {
        // Update only if not already opened
        if (!existingRecord.opened_at) {
          const { data: updateData, error: logError } = await supabase
            .from('participant_emails')
            .update({
              opened_at: new Date().toISOString(),
              status: 'opened'
            })
            .eq('id', emailLogId)
            .select();

          console.log('[track-email] Update result:', updateData);
          console.log('[track-email] Update error:', logError);

          if (logError) {
            console.error('[track-email] Error updating participant_emails:', logError);
          } else {
            console.log('[track-email] ✅ Email log updated successfully');
          }
        } else {
          console.log('[track-email] Email already opened at:', existingRecord.opened_at);
        }
      }
    }

    // Update participant if we have participant ID
    if (participantId) {
      const { error: participantError } = await supabase
        .from('participants')
        .update({
          email_status: 'opened'
        })
        .eq('id', participantId)
        .eq('email_status', 'sent'); // Only update if status is 'sent'

      if (participantError) {
        console.error('[track-email] Error updating participant:', participantError);
      } else {
        console.log('[track-email] Participant status updated to opened');
      }
    }

    // Always return tracking pixel with CORS headers
    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('[track-email] Error:', error);
    
    // Still return pixel even on error with CORS headers
    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
})
