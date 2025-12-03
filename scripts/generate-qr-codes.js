// Script to generate QR codes for all existing participants
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateQRForParticipant(participant) {
  try {
    console.log(`\n[${participant.id}] Generating QR code...`);
    
    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(participant.id, {
      width: 600,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log(`[${participant.id}] ✅ QR generated, length: ${qrDataUrl.length}`);
    
    // Convert to blob for storage upload
    const base64Data = qrDataUrl.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const fileName = `${participant.id}.png`;
    
    console.log(`[${participant.id}] Uploading to storage: ${fileName} (${bytes.length} bytes)...`);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('participant-qr-codes')
      .upload(fileName, bytes, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`[${participant.id}] ❌ Upload failed:`, uploadError.message);
      return { success: false, error: uploadError.message };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('participant-qr-codes')
      .getPublicUrl(fileName);
    
    const publicUrl = urlData.publicUrl;
    console.log(`[${participant.id}] Public URL: ${publicUrl}`);
    
    // Update participant record
    const { error: updateError } = await supabase
      .from('participants')
      .update({ qr_code_url: publicUrl })
      .eq('id', participant.id);
    
    if (updateError) {
      console.error(`[${participant.id}] ❌ Database update failed:`, updateError.message);
      return { success: false, error: updateError.message };
    }
    
    console.log(`[${participant.id}] ✅ QR code generated and saved successfully!`);
    return { success: true, url: publicUrl };
    
  } catch (error) {
    console.error(`[${participant.id}] ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting QR code generation for all participants...\n');
  
  // Fetch all participants without QR codes
  const { data: participants, error } = await supabase
    .from('participants')
    .select('id, name, email, qr_code_url')
    .is('qr_code_url', null);
  
  if (error) {
    console.error('❌ Failed to fetch participants:', error);
    process.exit(1);
  }
  
  if (!participants || participants.length === 0) {
    console.log('✅ All participants already have QR codes!');
    process.exit(0);
  }
  
  console.log(`Found ${participants.length} participants without QR codes\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const participant of participants) {
    const result = await generateQRForParticipant(participant);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total: ${participants.length}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
