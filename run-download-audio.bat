@echo off
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: run-download-audio.bat ^<brand^>
  echo Available brands: naat-collection, naat-production, anas-raza-attari
  exit /b 2
)
node scripts\download-audio-with-cookies.js --project "%~1" --gap=15
