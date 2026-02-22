# Admin Panel

Admin-only web application for managing naat audio files.

## Features

- **Manual Audio Cut**: Manually cut explanation parts from naats by specifying timestamps

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start dev server:

   ```bash
   npm run dev
   ```

3. Navigate to: `http://localhost:3000`

## Routes

- `/` - Redirects to admin
- `/admin` - Redirects to manual-cut
- `/admin/manual-cut` - Manual audio cutting interface

## API Routes

- `POST /api/admin/cut-audio` - Cut audio based on timestamps
- `POST /api/admin/approve-cut` - Approve and save cut audio
- `DELETE /api/admin/reject-cut` - Reject and delete temp cut audio
