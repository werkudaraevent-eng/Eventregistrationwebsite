-- =====================================================
-- Add QR Code Storage to Participants Table
-- =====================================================

-- Step 1: Add qr_code_url column to participants table
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Step 2: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_participants_qr_code ON participants(qr_code_url);

-- Step 3: Add comment
COMMENT ON COLUMN participants.qr_code_url IS 'URL to QR code image stored in Supabase Storage';

-- =====================================================
-- Verify Installation
-- =====================================================

-- Check column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'participants' 
  AND column_name = 'qr_code_url';

-- Success message
SELECT '✅ QR code column added successfully!' as status;
