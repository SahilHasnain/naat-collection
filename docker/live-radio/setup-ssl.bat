@echo off
REM Setup SSL certificates for Live Radio streaming
SET DOMAIN=owaisrazaqadri.duckdns.org
SET EMAIL=mdsahil1631@gmail.com

echo Setting up SSL certificates for %DOMAIN%

REM Create directories
if not exist "certbot\conf" mkdir certbot\conf
if not exist "certbot\www" mkdir certbot\www

REM Check if certificates already exist
if exist "certbot\conf\live\%DOMAIN%" (
    echo Certificates already exist for %DOMAIN%
    set /p RENEW="Do you want to renew them? (y/n) "
    if /i not "%RENEW%"=="y" exit /b 0
)

REM Start nginx temporarily for certificate generation
echo Starting nginx for certificate generation...
docker-compose up -d nginx

REM Wait for nginx to be ready
timeout /t 5 /nobreak

REM Request certificate
echo Requesting SSL certificate from Let's Encrypt...
docker-compose run --rm certbot certonly ^
    --webroot ^
    --webroot-path=/var/www/certbot ^
    --email %EMAIL% ^
    --agree-tos ^
    --no-eff-email ^
    -d %DOMAIN%

if %ERRORLEVEL% EQU 0 (
    echo ✓ SSL certificate obtained successfully!
    echo Restarting nginx with SSL...
    docker-compose restart nginx
    echo.
    echo Your stream is now available at:
    echo   https://%DOMAIN%/live
    echo.
    echo API endpoints:
    echo   https://%DOMAIN%/api/current
    echo   https://%DOMAIN%/health
) else (
    echo ✗ Failed to obtain SSL certificate
    echo Please check:
    echo   1. Your domain %DOMAIN% points to this server's IP
    echo   2. Ports 80 and 443 are open in your firewall
    echo   3. No other service is using ports 80 or 443
    exit /b 1
)
