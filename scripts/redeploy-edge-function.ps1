# Force redeploy Edge Function
Write-Host "Stopping all node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Waiting for cleanup..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Deploying send-email Edge Function..." -ForegroundColor Green
npx supabase functions deploy send-email --no-verify-jwt

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Now test by sending a campaign and check Supabase logs for:" -ForegroundColor Cyan
Write-Host "  🚀 send-email Edge Function v2.0 - QR Generation Enabled" -ForegroundColor White
