import { useFilterModal } from "@/contexts/FilterModalContext";
import { useSearch as useSearchContext } from "@/contexts/SearchContext";
import { useChannels } from "@/hooks/useChannels";
import { useNaats } from "@/hooks/useNaats";
import { useSearch } from "@/hooks/useSearch";
import { useTeenageReady } from "@/hooks/useTeenageReady";
import type { DurationOption, SortOption } from "@/types";
import { filterNaatsByDuration } from "@naat-collection/shared";
import React, { useCallback, useState } from "react";

export function useHomeFilters() {
  // Home filters
  const [selectedFilter, setSelectedFilter] = useState<SortOption>("forYou");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>("all");
  const [pureOnly, setPureOnly] = useState(false);
  const [teenageOnly, setTeenageOnly] = useState(false);

  // Search-specific filters
  const [searchChannelId, setSearchChannelId] = useState<string | null>(null);
  const [searchDuration, setSearchDuration] = useState<DurationOption>("all");
  const [searchPureOnly, setSearchPureOnly] = useState(false);
  const [searchTeenageOnly, setSearchTeenageOnly] = useState(false);

  const { showFilterModal, setShowFilterModal } = useFilterModal();
  const { isSearchActive, activeSearchQuery } = useSearchContext();

  const {
    readyAudioIds,
    readyLoaded: teenageReadyLoaded,
    loading: teenageReadyLoading,
    error: teenageReadyError,
    refresh: refreshTeenageReady,
  } = useTeenageReady(teenageOnly || searchTeenageOnly);

  // Data fetching
  const { channels, loading: channelsLoading, refresh: refreshChannels } = useChannels();
  const { naats, loading, error, hasMore, loadMore, refresh, removeNaat, updateNaat } = useNaats(
    selectedChannelId,
    selectedFilter,
    pureOnly,
    teenageOnly,
    readyAudioIds,
  );
  const { results: searchResults, loading: searchLoading, setQuery } = useSearch(
    searchChannelId,
    searchPureOnly,
    searchTeenageOnly,
    readyAudioIds,
  );

  const isShowingSearchResults = isSearchActive && activeSearchQuery.length > 0;

  // Compute display data
  const homeDisplayData = React.useMemo(() => {
    return filterNaatsByDuration(naats, selectedDuration);
  }, [naats, selectedDuration]);

  const searchDisplayData = React.useMemo(() => {
    return filterNaatsByDuration(searchResults, searchDuration);
  }, [searchResults, searchDuration]);

  const displayData = isShowingSearchResults ? searchDisplayData : homeDisplayData;

  const isTeenageFilterActive = isShowingSearchResults
    ? searchTeenageOnly
    : teenageOnly;
  const isWaitingForTeenageReady =
    isTeenageFilterActive && (!teenageReadyLoaded || teenageReadyLoading);
  const isLoading =
    (isShowingSearchResults ? searchLoading : loading) ||
    isWaitingForTeenageReady;

  const hasActiveHomeFilters =
    selectedFilter !== "forYou" ||
    selectedChannelId !== null ||
    selectedDuration !== "all" ||
    pureOnly ||
    teenageOnly;

  const resetSearchFilters = useCallback(() => {
    setSearchChannelId(null);
    setSearchDuration("all");
    setSearchPureOnly(false);
    setSearchTeenageOnly(false);
  }, []);

  return {
    // Home filters
    selectedFilter, setSelectedFilter,
    selectedChannelId, setSelectedChannelId,
    selectedDuration, setSelectedDuration,
    pureOnly, setPureOnly,
    teenageOnly, setTeenageOnly,
    // Search filters
    searchChannelId, setSearchChannelId,
    searchDuration, setSearchDuration,
    searchPureOnly, setSearchPureOnly,
    searchTeenageOnly, setSearchTeenageOnly,
    resetSearchFilters,
    // Teenage voice readiness
    teenageReadyLoading,
    teenageReadyLoaded,
    teenageReadyError,
    teenageReadyAudioIds: readyAudioIds,
    refreshTeenageReady,
    // Filter modal
    showFilterModal, setShowFilterModal,
    // Data
    channels, channelsLoading, refreshChannels,
    naats, loading, error, hasMore, loadMore, refresh, removeNaat, updateNaat,
    searchResults, searchLoading, setQuery,
    // Derived
    isShowingSearchResults,
    displayData, isLoading,
    hasActiveHomeFilters,
  };
}
