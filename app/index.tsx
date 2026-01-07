import { BackToTopButton, VideoModal } from "@/components";
import EmptyState from "@/components/EmptyState";
import FilterBar, { FilterOption } from "@/components/FilterBar";
import NaatCard from "@/components/NaatCard";
import SearchBar from "@/components/SearchBar";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import type { Naat } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export default function HomeScreen() {
  // Modal state
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("latest");

  // Back to top state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Data fetching hooks
  const { naats, loading, error, hasMore, loadMore, refresh } =
    useNaats(selectedFilter);
  const {
    query,
    results: searchResults,
    loading: searchLoading,
    setQuery,
  } = useSearch();

  // Load initial data on mount and when filter changes
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]);

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

  // Handle filter change
  const handleFilterChange = (filter: FilterOption) => {
    setSelectedFilter(filter);
  };

  // Handle infinite scroll
  const handleEndReached = () => {
    if (!isSearching && hasMore && !loading) {
      loadMore();
    }
  };

  // Handle scroll to show/hide back to top button
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 500);
  };

  // Scroll to top
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
        channelName={item.channelName}
        views={item.views}
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
        <ActivityIndicator size="small" color={colors.accent.secondary} />
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading && displayData.length === 0) {
      return (
        <View className="items-center justify-center flex-1 py-20">
          <ActivityIndicator size="large" color={colors.accent.secondary} />
          <Text className="mt-4 text-base text-neutral-400">
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
    <SafeAreaView className="flex-1 bg-neutral-900" edges={["bottom"]}>
      <View className="flex-1">
        {/* Sticky Search Bar */}
        <View className="px-4 pt-safe-top pb-3 bg-neutral-800 border-b border-neutral-700">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search naats..."
          />
        </View>

        {/* Scrollable Content */}
        <FlatList
          ref={flatListRef}
          data={displayData}
          renderItem={renderNaatCard}
          keyExtractor={(item) => item.$id}
          getItemLayout={getItemLayout}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 50,
          }}
          ListHeaderComponent={
            !isSearching ? (
              <FilterBar
                selectedFilter={selectedFilter}
                onFilterChange={handleFilterChange}
              />
            ) : null
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          onScroll={handleScroll}
          scrollEventThrottle={400}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              colors={[colors.accent.secondary]}
              tintColor={colors.accent.secondary}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
        />

        {/* Back to Top Button */}
        <BackToTopButton visible={showBackToTop} onPress={scrollToTop} />
      </View>

      {/* Video Modal */}
      {selectedNaat && (
        <VideoModal
          visible={modalVisible}
          onClose={handleCloseModal}
          videoUrl={selectedNaat.videoUrl}
          title={selectedNaat.title}
          channelName={selectedNaat.channelName}
          thumbnailUrl={selectedNaat.thumbnailUrl}
          youtubeId={selectedNaat.youtubeId}
        />
      )}
    </SafeAreaView>
  );
}
