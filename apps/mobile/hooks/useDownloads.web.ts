/**
 * useDownloads — web build
 * Downloads require the local file system (expo-file-system), which is not
 * available on web. This hook keeps the same shape so screens render without
 * crashing; there are never any downloads on web.
 */

import { useCallback, useState } from "react";

import type { DownloadMetadata } from "../services/audioDownload";
import type { UseDownloadsReturn } from "./useDownloads";

export function useDownloads(): UseDownloadsReturn {
  const [downloads] = useState<DownloadMetadata[]>([]);
  const [loading] = useState<boolean>(false);
  const [error] = useState<Error | null>(null);
  const [totalSize] = useState<number>(0);

  const refresh = useCallback(async () => {}, []);
  const deleteAudio = useCallback(async () => {}, []);
  const clearAll = useCallback(async () => {}, []);

  return {
    downloads,
    loading,
    error,
    totalSize,
    refresh,
    deleteAudio,
    clearAll,
  };
}