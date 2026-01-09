import { BackToTopButton, VideoModal } from "@/components";
import ChannelFilterBar from "@/components/ChannelFilterBar";
import EmptyState from "@/components/EmptyState";
import NaatCard from "@/components/NaatCard";
import SearchBar from "@/components/SearchBar";
import SortFilterBar from "@/components/SortFilterBar";
import { colors } from "@/constants/theme";
import { useChannels } from "@/hooks/useChannels";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import type { Naat, SortOption } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  // Modal state
  const [selectedNaat, setSelectedNaat] = useState<Naat | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<SortOption>("latest");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null
  );

  // Back to top state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Data fetching hooks
  const {
    channels,
    loading: channelsLoading,
    refresh: refreshChannels,
  } = useChannels();
  const { naats, loading, error, hasMore, loadMore, refresh } = useNaats(
    selectedChannelId,
    selectedFilter
  );
  const {
    query,
    results: searchResults,
    loading: searchLoading,
    setQuery,
  } = useSearch(selectedChannelId);

  // Load initial data on mount and when filter changes
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, selectedChannelId]);

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
    await Promise.all([refresh(), refreshChannels()]);
  };

  // Handle filter change
  const handleFilterChange = (filter: SortOption) => {
    setSelectedFilter(filter);
  };

  // Handle channel filter change
  const handleChannelChange = (channelId: string | null) => {
    setSelectedChannelId(channelId);
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
    <View className="flex-1 bg-neutral-900">
      <View className="flex-1">
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
            <>
              {/* Search Bar */}
              <View className="px-4 pt-safe-top pb-3 bg-neutral-800 border-b border-neutral-700">
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search naats..."
                />
              </View>

              {!isSearching ? (
                <>
                  <ChannelFilterBar
                    channels={channels}
                    selectedChannelId={selectedChannelId}
                    onChannelChange={handleChannelChange}
                    loading={channelsLoading}
                  />
                  <SortFilterBar
                    selectedFilter={selectedFilter}
                    onFilterChange={handleFilterChange}
                  />
                </>
              ) : null}
            </>
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
          audioId={selectedNaat.audioId}
        />
      )}
    </View>
  );
}
