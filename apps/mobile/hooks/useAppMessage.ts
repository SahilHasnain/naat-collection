import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const MESSAGE_URL =
  "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/app-message.json";
const LAST_SEEN_KEY = "@app_message_last_seen_id";

export interface AppMessage {
  id: number;
  message: string;
  type?: "info" | "update" | "alert";
}

export function useAppMessage() {
  const [message, setMessage] = useState<AppMessage | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const check = async () => {
    try {
      const lastSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);
      const res = await globalThis.fetch(MESSAGE_URL);
      const data: AppMessage = await res.json();
      if (!data.id || !data.message) return;
      if (lastSeen && Number(lastSeen) >= data.id) return;
      setMessage(data);
    } catch {}
  };

  useEffect(() => { check(); }, []);

  const dismiss = async () => {
    if (message) {
      try {
        await AsyncStorage.setItem(LAST_SEEN_KEY, String(message.id));
      } catch {}
      setDismissed(true);
    }
  };

  const preview = async () => {
    await AsyncStorage.removeItem(LAST_SEEN_KEY);
    setDismissed(false);
    await check();
  };

  return { message: dismissed ? null : message, dismiss, preview };
}
