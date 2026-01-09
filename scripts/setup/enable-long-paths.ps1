# Enable Windows Long Path Support
# Run this as Administrator

Write-Host "Enabling Windows Long Path Support..." -ForegroundColor Yellow

# Set registry key
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

Write-Host "✓ Long Path Support Enabled!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: You must restart your computer for changes to take effect." -ForegroundColor Red
Write-Host ""
Write-Host "After restart, run: pip install faster-whisper" -ForegroundColor Cyan
