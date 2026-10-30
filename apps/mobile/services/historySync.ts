import {
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
} from "react-native-appwrite";
import type { Models } from "react-native-appwrite";
import { appwriteConfig } from "@/config/appwrite";
import { HistorySyncEvent, storageService } from "@/services/storage";

const HISTORY_COLLECTION_ID = "user_history";

type HistoryDocument = Models.Document & {
  userId: string;
  naatId: string;
  watchedAt: number;
  isRemoved: boolean;
  clientUpdatedAt: string;
  deviceId: string;
};

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);
const databases = new Databases(client);

function permissionsForUser(userId: string): string[] {
  const user = Role.user(userId);
  return [Permission.read(user), Permission.update(user), Permission.delete(user)];
}

function latestByNaatId(events: HistorySyncEvent[]): Map<string, HistorySyncEvent> {
  const map = new Map<string, HistorySyncEvent>();
  for (const event of events) {
    if (event.naatId === "*") continue;
    const existing = map.get(event.naatId);
    if (
      !existing ||
      event.clientUpdatedAt > existing.clientUpdatedAt ||
      (event.clientUpdatedAt === existing.clientUpdatedAt &&
        event.watchedAt > existing.watchedAt)
    ) {
      map.set(event.naatId, event);
    }
  }
  return map;
}

function parseTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isMissingCollection(error: any): boolean {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.code === 404 ||
    message.includes("collection") && (message.includes("not found") || message.includes("could not find"))
  );
}

export const historySyncService = {
  async sync(userId: string): Promise<void> {
    let cloudResponse: Models.DocumentList<HistoryDocument>;
    try {
      cloudResponse = await databases.listDocuments<HistoryDocument>(
        appwriteConfig.databaseId,
        HISTORY_COLLECTION_ID,
        [Query.equal("userId", userId), Query.limit(500)],
      );
    } catch (error) {
      if (isMissingCollection(error)) {
        // Collection not provisioned yet; keep local queue intact
        return;
      }
      throw error;
    }

    const [localIds, localTimestamps, pendingEvents, clearedAt] = await Promise.all([
      storageService.getWatchHistory(),
      storageService.getWatchHistoryTimestamps(),
      storageService.getHistorySyncQueue(),
      storageService.getHistoryClearedAt(),
    ]);

    const clearAt =
      clearedAt ??
      (() => {
        const clearEvent = pendingEvents.find((event) => event.naatId === "*");
        return clearEvent ? clearEvent.watchedAt : null;
      })();

    const localEventMap = latestByNaatId(pendingEvents);
    const cloudEventMap = new Map<string, HistorySyncEvent>();

    for (const document of cloudResponse.documents) {
      if (document.naatId === "*") {
        continue;
      }
      const event: HistorySyncEvent = {
        naatId: document.naatId,
        isRemoved: Boolean(document.isRemoved),
        watchedAt: parseTimestamp(document.watchedAt),
        clientUpdatedAt: document.clientUpdatedAt,
        deviceId: document.deviceId,
      };
      cloudEventMap.set(document.naatId, event);
    }

    // Merge cleared state: if either side cleared, use the latest clear
    let effectiveClearAt = clearAt;
    for (const event of pendingEvents) {
      if (event.naatId === "*" && (!effectiveClearAt || event.watchedAt >= effectiveClearAt)) {
        effectiveClearAt = event.watchedAt;
      }
    }
    for (const document of cloudResponse.documents) {
      if (document.naatId === "*") {
        const watchedAt = parseTimestamp(document.watchedAt);
        if (!effectiveClearAt || watchedAt >= effectiveClearAt) {
          effectiveClearAt = watchedAt;
        }
      }
    }
    if (effectiveClearAt) {
      await storageService.setHistoryClearedAt(effectiveClearAt);
    }

    const mergedEvents = new Map(cloudEventMap);

    for (const naatId of localIds) {
      const ts = localTimestamps[naatId] || Date.now();
      if (!mergedEvents.has(naatId) && !localEventMap.has(naatId)) {
        if (effectiveClearAt && ts <= effectiveClearAt) {
          continue;
        }
        mergedEvents.set(naatId, {
          naatId,
          isRemoved: false,
          watchedAt: ts,
          clientUpdatedAt: new Date(ts).toISOString(),
          deviceId: "legacy-local",
        });
      }
    }

    for (const [naatId, localEvent] of localEventMap) {
      if (effectiveClearAt && localEvent.naatId !== "*" && localEvent.watchedAt <= effectiveClearAt) {
        continue;
      }
      const cloudEvent = mergedEvents.get(naatId);
      if (
        !cloudEvent ||
        localEvent.clientUpdatedAt > cloudEvent.clientUpdatedAt ||
        (localEvent.clientUpdatedAt === cloudEvent.clientUpdatedAt &&
          localEvent.watchedAt > cloudEvent.watchedAt)
      ) {
        mergedEvents.set(naatId, localEvent);
      } else if (cloudEvent.clientUpdatedAt > localEvent.clientUpdatedAt) {
        mergedEvents.set(naatId, cloudEvent);
      }
    }

    // Apply effective clear to merged events
    for (const [naatId, event] of mergedEvents) {
      if (effectiveClearAt && event.watchedAt <= effectiveClearAt) {
        mergedEvents.set(naatId, { ...event, isRemoved: true });
      }
    }

    const activeEvents = [...mergedEvents.values()].filter(
      (event) => !event.isRemoved,
    );

    activeEvents.sort((a, b) => b.watchedAt - a.watchedAt);

    const finalIds = activeEvents.map((event) => event.naatId);
    const finalTimestamps: Record<string, number> = {};
    for (const event of activeEvents) {
      finalTimestamps[event.naatId] = event.watchedAt;
    }

    for (const event of mergedEvents.values()) {
      if (effectiveClearAt && event.naatId !== "*" && event.watchedAt <= effectiveClearAt) {
        continue;
      }
      const existingDocument = cloudResponse.documents.find(
        (document) => document.naatId === event.naatId,
      );
      const data = {
        userId,
        naatId: event.naatId,
        watchedAt: event.watchedAt,
        isRemoved: event.isRemoved,
        updatedAt: new Date().toISOString(),
        clientUpdatedAt: event.clientUpdatedAt,
        deviceId: event.deviceId,
      };

      try {
        if (existingDocument) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            HISTORY_COLLECTION_ID,
            existingDocument.$id,
            data,
            permissionsForUser(userId),
          );
        } else {
          await databases.createDocument(
            appwriteConfig.databaseId,
            HISTORY_COLLECTION_ID,
            ID.unique(),
            data,
            permissionsForUser(userId),
          );
        }
      } catch (error) {
        if (isMissingCollection(error)) {
          return;
        }
        throw error;
      }
    }

    // Push clear-all marker if present
    if (effectiveClearAt) {
      const clearEvent: HistorySyncEvent = {
        naatId: "*",
        isRemoved: true,
        watchedAt: effectiveClearAt,
        clientUpdatedAt: new Date(effectiveClearAt).toISOString(),
        deviceId: pendingEvents.find((e) => e.naatId === "*")?.deviceId || "legacy-local",
      };
      const existingClear = cloudResponse.documents.find(
        (document) => document.naatId === "*",
      );
      const clearData = {
        userId,
        naatId: "*",
        watchedAt: effectiveClearAt,
        isRemoved: true,
        updatedAt: new Date().toISOString(),
        clientUpdatedAt: clearEvent.clientUpdatedAt,
        deviceId: clearEvent.deviceId,
      };
      try {
        if (existingClear) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            HISTORY_COLLECTION_ID,
            existingClear.$id,
            clearData,
            permissionsForUser(userId),
          );
        } else {
          await databases.createDocument(
            appwriteConfig.databaseId,
            HISTORY_COLLECTION_ID,
            ID.unique(),
            clearData,
            permissionsForUser(userId),
          );
        }
      } catch (error) {
        if (isMissingCollection(error)) {
          return;
        }
      }
    }

    await storageService.setWatchHistoryFromSync(finalIds, finalTimestamps);
    await storageService.clearHistorySyncQueue();
  },
};

export default historySyncService;
