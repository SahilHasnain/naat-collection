import { useFilterModal } from "@/contexts/FilterModalContext";
import { useSearch as useSearchContext } from "@/contexts/SearchContext";
import { useChannels } from "@/hooks/useChannels";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import type { DurationOption, SortOption } from "@/types";
import { filterNaatsByDuration } from "@naat-collection/shared";
import React, { useCallback, useState } from "react";

export function useHomeFilters() {
  // Home filters
  const [selectedFilter, setSelectedFilter] = useState<SortOption>("forYou");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>("all");
  const [pureOnly, setPureOnly] = useState(false);

  // Search-specific filters
  const [searchChannelId, setSearchChannelId] = useState<string | null>(null);
  const [searchDuration, setSearchDuration] = useState<DurationOption>("all");
  const [searchPureOnly, setSearchPureOnly] = useState(false);

  const { showFilterModal, setShowFilterModal } = useFilterModal();
  const { isSearchActive, activeSearchQuery } = useSearchContext();

  // Data fetching
  const { channels, loading: channelsLoading, refresh: refreshChannels } = useChannels();
  const { naats, loading, error, hasMore, loadMore, refresh } = useNaats(selectedChannelId, selectedFilter, pureOnly);
  const { results: searchResults, loading: searchLoading, setQuery } = useSearch(searchChannelId, searchPureOnly);

  const isShowingSearchResults = isSearchActive && activeSearchQuery.length > 0;

  // Compute display data
  const homeDisplayData = React.useMemo(() => {
    return filterNaatsByDuration(naats, selectedDuration);
  }, [naats, selectedDuration]);

  const searchDisplayData = React.useMemo(() => {
    return filterNaatsByDuration(searchResults, searchDuration);
  }, [searchResults, searchDuration]);

  const displayData = isShowingSearchResults ? searchDisplayData : homeDisplayData;

  const isLoading = isShowingSearchResults ? searchLoading : loading;

  const hasActiveHomeFilters =
    selectedFilter !== "forYou" ||
    selectedChannelId !== null ||
    selectedDuration !== "all" ||
    pureOnly;

  const resetSearchFilters = useCallback(() => {
    setSearchChannelId(null);
    setSearchDuration("all");
    setSearchPureOnly(false);
  }, []);

  return {
    // Home filters
    selectedFilter, setSelectedFilter,
    selectedChannelId, setSelectedChannelId,
    selectedDuration, setSelectedDuration,
    pureOnly, setPureOnly,
    // Search filters
    searchChannelId, setSearchChannelId,
    searchDuration, setSearchDuration,
    searchPureOnly, setSearchPureOnly,
    resetSearchFilters,
    // Filter modal
    showFilterModal, setShowFilterModal,
    // Data
    channels, channelsLoading, refreshChannels,
    naats, loading, error, hasMore, loadMore, refresh,
    searchResults, searchLoading, setQuery,
    // Derived
    isShowingSearchResults,
    displayData, isLoading,
    hasActiveHomeFilters,
  };
}
