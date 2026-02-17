# Run this script as Administrator
# Right-click PowerShell and select "Run as Administrator"

Write-Host "Binding USB device to WSL..." -ForegroundColor Green
usbipd bind --busid 2-2

Write-Host "Attaching USB device to WSL..." -ForegroundColor Green
usbipd attach --wsl --busid 2-2

Write-Host "Done! Device should now be available in WSL" -ForegroundColor Green
Write-Host "Verify with: wsl lsusb" -ForegroundColor Yellow
