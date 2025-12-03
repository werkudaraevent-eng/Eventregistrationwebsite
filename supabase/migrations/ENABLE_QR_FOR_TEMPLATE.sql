-- =====================================================
-- Enable QR Code for Email Template
-- =====================================================

-- Step 1: Check existing templates
SELECT id, name, include_qr_code 
FROM email_templates 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 2: Copy one of the UUID from above results, then run:
-- Replace the UUID below with actual template ID from Step 1

-- Example (REPLACE WITH YOUR ACTUAL UUID):
-- UPDATE email_templates 
-- SET include_qr_code = true 
-- WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Step 3: Verify the update
-- SELECT id, name, include_qr_code 
-- FROM email_templates 
-- WHERE include_qr_code = true;

-- =====================================================
-- Quick Enable for First Template
-- =====================================================
-- This enables QR code for the most recent template

UPDATE email_templates 
SET include_qr_code = true 
WHERE id = (
  SELECT id FROM email_templates 
  ORDER BY created_at DESC 
  LIMIT 1
)
RETURNING id, name, include_qr_code;

-- =====================================================
-- Disable QR Code After Testing
-- =====================================================
-- Uncomment to disable after testing:

-- UPDATE email_templates 
-- SET include_qr_code = false 
-- WHERE include_qr_code = true;
