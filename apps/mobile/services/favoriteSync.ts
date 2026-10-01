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
import {
  FavoriteSyncEvent,
  storageService,
} from "@/services/storage";

const FAVORITES_COLLECTION_ID = "user_favorites";

type FavoriteDocument = Models.Document & {
  userId: string;
  naatId: string;
  isFavorite: boolean;
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

function latestByNaatId(events: FavoriteSyncEvent[]): Map<string, FavoriteSyncEvent> {
  return new Map(events.map((event) => [event.naatId, event]));
}

export const favoriteSyncService = {
  async sync(userId: string): Promise<void> {
    const [localIds, pendingEvents, cloudResponse] = await Promise.all([
      storageService.getFavoriteNaatIds(),
      storageService.getFavoriteSyncQueue(),
      databases.listDocuments<FavoriteDocument>(
        appwriteConfig.databaseId,
        FAVORITES_COLLECTION_ID,
        [Query.equal("userId", userId), Query.limit(500)],
      ),
    ]);

    const localEventMap = latestByNaatId(pendingEvents);
    const cloudEventMap = latestByNaatId(
      cloudResponse.documents.map((document) => ({
        naatId: document.naatId,
        isFavorite: document.isFavorite,
        clientUpdatedAt: document.clientUpdatedAt,
        deviceId: document.deviceId,
      })),
    );
    const mergedEvents = new Map(cloudEventMap);

    for (const naatId of localIds) {
      if (!mergedEvents.has(naatId) && !localEventMap.has(naatId)) {
        mergedEvents.set(naatId, {
          naatId,
          isFavorite: true,
          clientUpdatedAt: new Date().toISOString(),
          deviceId: "legacy-local",
        });
      }
    }

    for (const [naatId, localEvent] of localEventMap) {
      const cloudEvent = mergedEvents.get(naatId);
      if (
        !cloudEvent ||
        localEvent.clientUpdatedAt >= cloudEvent.clientUpdatedAt
      ) {
        mergedEvents.set(naatId, localEvent);
      }
    }

    const localFavoriteIds = [...mergedEvents.values()]
      .filter((event) => event.isFavorite)
      .map((event) => event.naatId);

    for (const event of mergedEvents.values()) {
      const existingDocument = cloudResponse.documents.find(
        (document) => document.naatId === event.naatId,
      );
      const data = {
        userId,
        naatId: event.naatId,
        isFavorite: event.isFavorite,
        updatedAt: new Date().toISOString(),
        clientUpdatedAt: event.clientUpdatedAt,
        deviceId: event.deviceId,
      };

      if (existingDocument) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          FAVORITES_COLLECTION_ID,
          existingDocument.$id,
          data,
          permissionsForUser(userId),
        );
      } else {
        await databases.createDocument(
          appwriteConfig.databaseId,
          FAVORITES_COLLECTION_ID,
          ID.unique(),
          data,
          permissionsForUser(userId),
        );
      }
    }

    await storageService.setFavoriteNaatIds(localFavoriteIds);
    await storageService.clearFavoriteSyncQueue();
  },
};
