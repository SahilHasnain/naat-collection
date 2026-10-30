import { favoriteSyncService } from "@/services/favoriteSync";
import { historySyncService } from "@/services/historySync";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let activeUserId: string | null = null;
let isSyncing = false;

const DEBOUNCE_MS = 1500;

export const cloudSyncService = {
  setCloudSyncUser(userId: string | null): void {
    activeUserId = userId;
  },

  scheduleCloudSync(): void {
    if (!activeUserId) {
      return;
    }

    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(() => {
      void this.flushCloudSync();
    }, DEBOUNCE_MS);
  },

  async flushCloudSync(userId?: string | null): Promise<void> {
    const user = userId !== undefined ? userId : activeUserId;
    if (!user) {
      return;
    }

    if (isSyncing) {
      this.scheduleCloudSync();
      return;
    }

    isSyncing = true;
    try {
      await Promise.allSettled([
        favoriteSyncService.sync(user),
        historySyncService.sync(user),
      ]);
    } finally {
      isSyncing = false;
    }
  },
};

export default cloudSyncService;
