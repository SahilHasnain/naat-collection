/**
 * Live Radio Listener Tracking Types
 */

export interface LiveRadioListener {
  $id: string; // Unique listener ID (device ID or session ID)
  lastHeartbeat: string; // ISO timestamp of last heartbeat
  deviceInfo?: string; // Optional device info
  $createdAt: string;
  $updatedAt: string;
}
