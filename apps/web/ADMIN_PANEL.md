# Admin Panel - Processed Audio Review

## Access

Navigate to: **http://localhost:3000/admin/processed-audio**

## Features

### Review Processed Audio

- View all naats that have been processed by AI
- See processing date and naat details
- Listen to both original and processed audio side-by-side

### Compare Audio

- **Original Audio**: The unprocessed audio with explanations
- **Processed Audio**: AI-cleaned audio with explanations removed

### Delete Processed Audio

- If not satisfied with the AI processing, click "Delete Processed Audio"
- This will:
  - Delete the processed audio file from storage
  - Remove the `cutAudio` reference from database
  - Revert the naat to use original audio
  - The naat can be reprocessed later

## Usage

1. **Start the web app**:

   ```bash
   npm run web
   ```

2. **Navigate to admin panel**:

   ```
   http://localhost:3000/admin/processed-audio
   ```

3. **Review each naat**:
   - Listen to original audio
   - Listen to processed audio
   - Compare quality and accuracy

4. **Delete if needed**:
   - Click "Delete Processed Audio" button
   - Confirm the deletion
   - The naat will revert to original audio

## Notes

- Only naats with `cutAudio` field are shown
- Sorted by most recently processed first
- Shows up to 50 most recent processed naats
- Audio players load on demand (not preloaded)
- Deletion is permanent - the processed file is removed from storage

## Security

⚠️ **Important**: This is an admin-only route. In production, you should:

- Add authentication middleware
- Restrict access to admin users only
- Add rate limiting
- Log all deletion actions

## Future Enhancements

- Add authentication/authorization
- Add batch operations
- Add reprocessing capability
- Add quality ratings
- Add processing history/logs
- Add statistics dashboard
