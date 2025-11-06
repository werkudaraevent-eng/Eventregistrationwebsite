import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase client for auth
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

// Middleware to check admin auth
const requireAuth = async (c: any, next: any) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (!user || error) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  c.set('userId', user.id);
  await next();
};

// Generate unique participant ID
function generateParticipantId(): string {
  return 'P' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();
}

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Test endpoint to verify server is working
app.get("/test", (c) => {
  return c.json({ 
    message: "Server is working",
    timestamp: new Date().toISOString(),
    endpoints: {
      participants_public: "/participants/public",
      participant_manual: "/participant/manual"
    }
  });
});

// Register a new participant
app.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, company, position } = body;

    if (!name || !email) {
      return c.json({ error: 'Name and email are required' }, 400);
    }

    // Check if email already registered
    const existingParticipants = await kv.getByPrefix('participant:');
    const emailExists = existingParticipants.some((p: any) => p.email === email);
    
    if (emailExists) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Generate unique ID
    const participantId = generateParticipantId();

    // Create participant data
    const participant = {
      id: participantId,
      name,
      email,
      phone: phone || '',
      company: company || '',
      position: position || '',
      registeredAt: new Date().toISOString(),
      attendance: [],
    };

    // Save to database
    await kv.set(`participant:${participantId}`, participant);

    // Send confirmation email with QR code
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        console.log('Warning: RESEND_API_KEY not configured, skipping email');
      } else {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${participantId}`;
        
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Event Registration <onboarding@resend.dev>',
            to: [email],
            subject: 'Event Registration Confirmation',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Registration Confirmed!</h1>
                <p>Dear ${name},</p>
                <p>Thank you for registering for our event. Your registration has been confirmed.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Participant ID:</strong> ${participantId}</p>
                  <p><strong>Name:</strong> ${name}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                  ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
                  ${position ? `<p><strong>Position:</strong> ${position}</p>` : ''}
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <p><strong>Your QR Code:</strong></p>
                  <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 300px;" />
                  <p style="color: #666; font-size: 14px;">Please present this QR code at the event for check-in</p>
                </div>
                <p>We look forward to seeing you at the event!</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.log(`Email sending error: ${errorText}`);
        }
      }
    } catch (emailError) {
      console.log(`Failed to send confirmation email: ${emailError}`);
    }

    return c.json({ 
      success: true, 
      participantId,
      message: 'Registration successful. Please check your email for confirmation.'
    });
  } catch (error) {
    console.log(`Registration error: ${error}`);
    return c.json({ error: `Registration failed: ${error}` }, 500);
  }
});

// Get all participants (admin only)
app.get("/participants", requireAuth, async (c) => {
  try {
    const participants = await kv.getByPrefix('participant:');
    return c.json({ participants });
  } catch (error) {
    console.log(`Error fetching participants: ${error}`);
    return c.json({ error: `Failed to fetch participants: ${error}` }, 500);
  }
});

// Get all participants (public - for check-in pages)
app.get("/participants/public", async (c) => {
  try {
    console.log('[PUBLIC] Fetching participants from KV store...');
    const participants = await kv.getByPrefix('participant:');
    console.log(`[PUBLIC] Found ${participants.length} participants`);
    console.log('[PUBLIC] First few participants:', participants.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name })));
    return c.json({ participants });
  } catch (error) {
    console.log(`[PUBLIC] Error fetching participants: ${error}`);
    return c.json({ error: `Failed to fetch participants: ${error}` }, 500);
  }
});

// Create participant manually (admin only) - MUST BE BEFORE :id routes
app.post("/participant/manual", requireAuth, async (c) => {
  console.log('[MANUAL] Received manual participant creation request');
  try {
    let body;
    try {
      body = await c.req.json();
      console.log('[MANUAL] Request body:', body);
    } catch (jsonError) {
      console.log(`[MANUAL] JSON parsing error: ${jsonError}`);
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }

    const { name, email, phone, company, position } = body;

    if (!name || !email) {
      console.log('[MANUAL] Missing required fields');
      return c.json({ error: 'Name and email are required' }, 400);
    }

    // Check if email already registered
    console.log('[MANUAL] Checking for existing email...');
    const existingParticipants = await kv.getByPrefix('participant:');
    const emailExists = existingParticipants.some((p: any) => p.email === email);
    
    if (emailExists) {
      console.log('[MANUAL] Email already exists');
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Generate unique ID
    const participantId = generateParticipantId();
    console.log('[MANUAL] Generated participant ID:', participantId);

    // Create participant data
    const participant = {
      id: participantId,
      name,
      email,
      phone: phone || '',
      company: company || '',
      position: position || '',
      registeredAt: new Date().toISOString(),
      attendance: [],
    };

    // Save to database
    console.log('[MANUAL] Saving to database...');
    await kv.set(`participant:${participantId}`, participant);

    console.log(`[MANUAL] Participant created successfully: ${participantId}`);

    return c.json({ 
      success: true, 
      participant,
      message: 'Participant created successfully.'
    });
  } catch (error) {
    console.log(`[MANUAL] Error creating participant: ${error}`);
    console.log(`[MANUAL] Error stack: ${error.stack}`);
    return c.json({ error: `Failed to create participant: ${error}` }, 500);
  }
});

// Get participant by ID (for QR code scanning)
app.get("/participant/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const participant = await kv.get(`participant:${id}`);
    
    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    return c.json({ participant });
  } catch (error) {
    console.log(`Error fetching participant: ${error}`);
    return c.json({ error: `Failed to fetch participant: ${error}` }, 500);
  }
});

// Delete participant (admin only)
app.delete("/participant/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`participant:${id}`);
    return c.json({ success: true, message: 'Participant deleted' });
  } catch (error) {
    console.log(`Error deleting participant: ${error}`);
    return c.json({ error: `Failed to delete participant: ${error}` }, 500);
  }
});

// Update participant (admin only)
app.put("/participant/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const participant = await kv.get(`participant:${id}`);
    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    const updatedParticipant = { ...participant, ...updates };
    await kv.set(`participant:${id}`, updatedParticipant);
    
    return c.json({ success: true, participant: updatedParticipant });
  } catch (error) {
    console.log(`Error updating participant: ${error}`);
    return c.json({ error: `Failed to update participant: ${error}` }, 500);
  }
});

// Bulk import participants (admin only)
app.post("/participants/bulk", requireAuth, async (c) => {
  try {
    const { participants } = await c.req.json();

    if (!Array.isArray(participants) || participants.length === 0) {
      return c.json({ error: 'Invalid participants data' }, 400);
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const p of participants) {
      try {
        if (!p.name || !p.email) {
          results.failed.push({ data: p, reason: 'Missing name or email' });
          continue;
        }

        // Check if email already exists
        const existingParticipants = await kv.getByPrefix('participant:');
        const emailExists = existingParticipants.some((existing: any) => existing.email === p.email);
        
        if (emailExists) {
          results.failed.push({ data: p, reason: 'Email already registered' });
          continue;
        }

        const participantId = generateParticipantId();
        const participant = {
          id: participantId,
          name: p.name,
          email: p.email,
          phone: p.phone || '',
          company: p.company || '',
          position: p.position || '',
          registeredAt: new Date().toISOString(),
          attendance: [],
        };

        await kv.set(`participant:${participantId}`, participant);
        results.success.push(participant);
      } catch (error) {
        results.failed.push({ data: p, reason: `Error: ${error}` });
      }
    }

    return c.json({ 
      success: true, 
      imported: results.success.length,
      failed: results.failed.length,
      results 
    });
  } catch (error) {
    console.log(`Bulk import error: ${error}`);
    return c.json({ error: `Bulk import failed: ${error}` }, 500);
  }
});

// Record attendance
app.post("/attendance", async (c) => {
  try {
    const { participantId, agendaItem } = await c.req.json();
    
    const participant = await kv.get(`participant:${participantId}`);
    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Add attendance record
    const attendanceRecord = {
      agendaItem,
      timestamp: new Date().toISOString(),
    };

    const attendance = participant.attendance || [];
    attendance.push(attendanceRecord);
    
    const updatedParticipant = { ...participant, attendance };
    await kv.set(`participant:${participantId}`, updatedParticipant);

    return c.json({ success: true, participant: updatedParticipant });
  } catch (error) {
    console.log(`Error recording attendance: ${error}`);
    return c.json({ error: `Failed to record attendance: ${error}` }, 500);
  }
});

// Admin signup
app.post("/admin/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Admin signup error: ${error.message}`);
      return c.json({ error: `Signup failed: ${error.message}` }, 400);
    }

    return c.json({ success: true, message: 'Admin account created successfully' });
  } catch (error) {
    console.log(`Admin signup error: ${error}`);
    return c.json({ error: `Signup failed: ${error}` }, 500);
  }
});

// Get agenda items
app.get("/agenda", async (c) => {
  try {
    const agendaItems = await kv.getByPrefix('agenda:');
    return c.json({ agendaItems });
  } catch (error) {
    console.log(`Error fetching agenda: ${error}`);
    return c.json({ error: `Failed to fetch agenda: ${error}` }, 500);
  }
});

// Create agenda item (admin only)
app.post("/agenda", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, startTime, endTime, location } = body;

    if (!title || !startTime) {
      return c.json({ error: 'Title and start time are required' }, 400);
    }

    const agendaId = 'A' + Date.now();
    const agendaItem = {
      id: agendaId,
      title,
      description: description || '',
      startTime,
      endTime: endTime || '',
      location: location || '',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`agenda:${agendaId}`, agendaItem);

    return c.json({ success: true, agendaItem });
  } catch (error) {
    console.log(`Error creating agenda item: ${error}`);
    return c.json({ error: `Failed to create agenda item: ${error}` }, 500);
  }
});

// Update agenda item (admin only)
app.put("/agenda/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { title, description, startTime, endTime, location } = body;

    if (!title || !startTime) {
      return c.json({ error: 'Title and start time are required' }, 400);
    }

    // Get existing agenda item
    const existingItem = await kv.get(`agenda:${id}`);
    if (!existingItem) {
      return c.json({ error: 'Agenda item not found' }, 404);
    }

    const updatedAgendaItem = {
      ...existingItem,
      title,
      description: description || '',
      startTime,
      endTime: endTime || '',
      location: location || '',
    };

    await kv.set(`agenda:${id}`, updatedAgendaItem);

    return c.json({ success: true, agendaItem: updatedAgendaItem });
  } catch (error) {
    console.log(`Error updating agenda item: ${error}`);
    return c.json({ error: `Failed to update agenda item: ${error}` }, 500);
  }
});

// Delete agenda item (admin only)
app.delete("/agenda/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`agenda:${id}`);
    return c.json({ success: true, message: 'Agenda item deleted' });
  } catch (error) {
    console.log(`Error deleting agenda item: ${error}`);
    return c.json({ error: `Failed to delete agenda item: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);
