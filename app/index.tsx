import EmptyState from "@/components/EmptyState";
import NaatCard from "@/components/NaatCard";
import SearchBar from "@/components/SearchBar";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import type { Naat } from "@/types";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  // Data fetching hooks
  const { naats, loading, error, hasMore, loadMore, refresh } = useNaats();
  const {
    query,
    results: searchResults,
    loading: searchLoading,
    setQuery,
  } = useSearch();

  // Load initial data on mount
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine which data to display
  const isSearching = query.trim().length > 0;
  const displayData: Naat[] = isSearching ? searchResults : naats;
  const isLoading = isSearching ? searchLoading : loading;

  // Handle naat selection and navigation to player
  const handleNaatPress = (naatId: string) => {
    // Navigate to player screen with naat ID
    router.push({
      pathname: "/player/[id]",
      params: { id: naatId },
    } as any);
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    await refresh();
  };

  // Handle infinite scroll
  const handleEndReached = () => {
    if (!isSearching && hasMore && !loading) {
      loadMore();
    }
  };

  // Render individual naat card
  const renderNaatCard = ({ item }: { item: Naat }) => (
    <NaatCard
      id={item.$id}
      title={item.title}
      thumbnail={item.thumbnailUrl}
      duration={item.duration}
      uploadDate={item.uploadDate}
      reciterName={item.reciterName}
      onPress={() => handleNaatPress(item.$id)}
    />
  );

  // Render footer loading indicator
  const renderFooter = () => {
    if (!loading || isSearching || displayData.length === 0) {
      return null;
    }

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading && displayData.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-gray-600">Loading naats...</Text>
        </View>
      );
    }

    if (error && displayData.length === 0) {
      return (
        <EmptyState
          message="Unable to connect. Please check your internet connection."
          icon="⚠️"
          actionLabel="Retry"
          onAction={handleRefresh}
        />
      );
    }

    if (isSearching && displayData.length === 0) {
      return (
        <EmptyState message="No naats found matching your search." icon="🔍" />
      );
    }

    if (displayData.length === 0) {
      return (
        <EmptyState
          message="No naats available yet. Check back soon!"
          icon="🎵"
        />
      );
    }

    return null;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pb-2 pt-12 shadow-sm">
        <Text className="mb-4 text-2xl font-bold text-gray-900">Naats</Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search naats..."
        />
      </View>

      <FlatList
        data={displayData}
        renderItem={renderNaatCard}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={{
          padding: 16,
          flexGrow: 1,
        }}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </View>
  );
}
