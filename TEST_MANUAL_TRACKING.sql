-- Quick check: Get latest sent email and verify tracking pixel was created
SELECT 
  id,
  participant_id,
  subject,
  status,
  opened_at,
  sent_at,
  created_at
FROM participant_emails
WHERE status IN ('sent', 'pending')
ORDER BY created_at DESC
LIMIT 10;

-- Copy salah satu Email ID dan Participant ID dari hasil di atas
-- Lalu test tracking pixel secara manual dengan URL:
-- https://xtrognfmzyzqhsfvtgne.supabase.co/functions/v1/track-email?id=EMAIL_ID&pid=PARTICIPANT_ID

-- Contoh:
-- https://xtrognfmzyzqhsfvtgne.supabase.co/functions/v1/track-email?id=EM1764064838804AA29&pid=part_1763875473

-- Setelah buka URL di atas di browser, jalankan query ini untuk cek apakah ter-update:
-- SELECT id, status, opened_at FROM participant_emails WHERE id = 'EMAIL_ID';
