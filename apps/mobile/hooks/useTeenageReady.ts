import { useCallback, useEffect, useRef, useState } from "react";
import { getReadyVoiceAudioIds } from "../services/voiceTransform";

const EMPTY_AUDIO_IDS = new Set<string>();

/**
 * Loads the set of source audio IDs that already have a completed teenage
 * voice transform. The lookup is only performed once the filter is enabled.
 */
export function useTeenageReady(enabled: boolean = false) {
  const [readyAudioIds, setReadyAudioIds] = useState<Set<string>>(
    EMPTY_AUDIO_IDS,
  );
  const [readyLoaded, setReadyLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (forceRefresh: boolean = false) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const ids = await getReadyVoiceAudioIds("high", { forceRefresh });
      if (requestRef.current !== requestId) return;
      setReadyAudioIds(ids);
      setReadyLoaded(true);
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      setError(
        caught instanceof Error
          ? caught
          : new Error("Failed to load ready teenage voices"),
      );
      setReadyLoaded(true);
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  const refresh = useCallback(() => load(true), [load]);

  return { readyAudioIds, readyLoaded, loading, error, refresh };
}
