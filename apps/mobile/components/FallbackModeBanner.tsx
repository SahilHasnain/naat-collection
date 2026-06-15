import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { appwriteService } from '@/services/appwrite';

/**
 * FallbackModeBanner
 * 
 * Shows a banner when the app is using static JSON fallback
 * due to Appwrite database read limits being exceeded.
 */
export function FallbackModeBanner() {
  const [isInFallback, setIsInFallback] = useState(false);

  useEffect(() => {
    // Check fallback status periodically
    const checkFallback = () => {
      setIsInFallback(appwriteService.isInFallbackMode());
    };

    checkFallback();
    const interval = setInterval(checkFallback, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isInFallback) {
    return null;
  }

  return (
    <View className="bg-amber-500/20 border-l-4 border-amber-500 px-4 py-3 mx-4 my-2 rounded">
      <View className="flex-row items-start">
        <Text className="text-2xl mr-2">📦</Text>
        <View className="flex-1">
          <Text className="text-amber-900 dark:text-amber-100 font-semibold mb-1">
            Limited Mode Active
          </Text>
          <Text className="text-amber-800 dark:text-amber-200 text-sm">
            Using cached catalog. New content will be available next month when service resets.
          </Text>
        </View>
      </View>
    </View>
  );
}
