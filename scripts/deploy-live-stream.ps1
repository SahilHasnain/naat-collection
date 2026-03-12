# Deploy Live Stream Functions
# Usage: .\scripts\deploy-live-stream.ps1

Write-Host "🚀 Deploying HLS Live Stream Functions" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Build streaming generator
Write-Host "`nBuilding live-stream-generator..." -ForegroundColor Blue
Set-Location functions/live-stream-generator
npm install
npm run build
Write-Host "✓ Built live-stream-generator" -ForegroundColor Green

# Build metadata API
Write-Host "`nBuilding live-stream-metadata..." -ForegroundColor Blue
Set-Location ../live-stream-metadata
npm install
npm run build
Write-Host "✓ Built live-stream-metadata" -ForegroundColor Green

Set-Location ../..

Write-Host "`n✓ All functions built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Deploy functions via Appwrite Console or CLI"
Write-Host "2. Create 'live-stream' storage bucket"
Write-Host "3. Set environment variables in function settings"
Write-Host "4. Trigger live-stream-generator to start stream"
Write-Host ""
Write-Host "See HLS_STREAMING_DEPLOYMENT.md for detailed instructions"
