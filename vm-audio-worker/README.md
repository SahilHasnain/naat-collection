Minimal VM worker for audio download/upload.

Setup:
- install `yt-dlp` on the VM
- copy `.env.example` to `.env`
- place `cookies.txt` beside this file
- run `npm install`
- run `npm start`

Automate with cron:
`*/5 * * * * cd /path/to/vm-audio-worker && /usr/bin/npm start >> /var/log/naat-audio-worker.log 2>&1`
