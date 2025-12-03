-- QR Code Attachment Quick Test

-- Step 1: Check existing templates
SELECT id, name, include_qr_code 
FROM email_templates 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Enable QR code for test template
-- Replace 'YOUR_TEMPLATE_ID' with actual template ID from step 1
UPDATE email_templates 
SET include_qr_code = true 
WHERE id = 'YOUR_TEMPLATE_ID';

-- Step 3: Verify update
SELECT id, name, include_qr_code 
FROM email_templates 
WHERE id = 'YOUR_TEMPLATE_ID';

-- Expected: include_qr_code should be TRUE

-- Step 4: After sending test campaign, check email_logs
SELECT 
  el.id,
  el.participant_id,
  el.status,
  el.sent_at,
  p.email,
  p.id as participant_qr_data
FROM email_logs el
JOIN participants p ON el.participant_id = p.id
ORDER BY el.created_at DESC
LIMIT 5;

-- Step 5: Disable QR code after test (optional)
UPDATE email_templates 
SET include_qr_code = false 
WHERE id = 'YOUR_TEMPLATE_ID';
