import { VideoModal } from "@/components";
import EmptyState from "@/components/EmptyState";
import NaatCard from "@/components/NaatCard";
import SearchBar from "@/components/SearchBar";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import type { Naat } from "@/types";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useState } from "react";

export default function HomeScreen() {
  // Modal state
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  // Handle naat selection and open modal
  const handleNaatPress = (naatId: string) => {
    const naat = displayData.find((n) => n.$id === naatId);
    if (naat) {
      setSelectedNaat(naat);
      setModalVisible(true);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setModalVisible(false);
    // Delay clearing selected naat to allow modal animation to complete
    setTimeout(() => setSelectedNaat(null), 300);
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

  // Optimize FlatList performance with getItemLayout
  // Card height: ~200px (16:9 aspect ratio image) + 100px (content) + 20px (margin) = 320px
  const ITEM_HEIGHT = 320;
  const getItemLayout = (_data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  // Render individual naat card
  const renderNaatCard = ({ item }: { item: Naat }) => (
    <View className="px-4 mb-4">
      <NaatCard
        id={item.$id}
        title={item.title}
        thumbnail={item.thumbnailUrl}
        duration={item.duration}
        uploadDate={item.uploadDate}
        reciterName={item.reciterName}
        onPress={() => handleNaatPress(item.$id)}
      />
    </View>
  );

  // Render footer loading indicator
  const renderFooter = () => {
    if (!loading || isSearching || displayData.length === 0) {
      return null;
    }

    return (
      <View className="py-6">
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading && displayData.length === 0) {
      return (
        <View className="items-center justify-center flex-1 py-20">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-base text-neutral-600 dark:text-neutral-400">
            Loading naats...
          </Text>
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
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <FlatList
        data={displayData}
        renderItem={renderNaatCard}
        keyExtractor={(item) => item.$id}
        getItemLayout={getItemLayout}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 50,
        }}
        ListHeaderComponent={
          <View className="px-4 pt-safe-top pb-3 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search naats..."
            />
          </View>
        }
        stickyHeaderIndices={[0]}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={["#2563eb"]}
            tintColor="#2563eb"
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Video Modal */}
      {selectedNaat && (
        <VideoModal
          visible={modalVisible}
          onClose={handleCloseModal}
          videoUrl={selectedNaat.videoUrl}
          title={selectedNaat.title}
          reciterName={selectedNaat.reciterName}
        />
      )}
    </View>
  );
}
