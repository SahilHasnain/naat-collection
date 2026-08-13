import React, { createContext, useCallback, useContext, useState } from "react";

interface SearchContextType {
  isSearchActive: boolean;
  activateSearch: () => void;
  deactivateSearch: () => void;
  searchInput: string;
  setSearchInput: (input: string) => void;
  activeSearchQuery: string;
  setActiveSearchQuery: (query: string) => void;
  submitSearch: (query: string) => void;
  searchFocusNonce: number;
  requestSearchFocus: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [searchFocusNonce, setSearchFocusNonce] = useState(0);

  const activateSearch = useCallback(() => {
    setIsSearchActive(true);
  }, []);

  const deactivateSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchInput("");
    setActiveSearchQuery("");
  }, []);

  const submitSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed) {
      setActiveSearchQuery(trimmed);
    }
  }, []);

  // Forces the search input to re-focus even if search is already active
  // (e.g. tapping the Search tab while already on the home search bar).
  const requestSearchFocus = useCallback(() => {
    setIsSearchActive(true);
    setSearchFocusNonce((n) => n + 1);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        isSearchActive,
        activateSearch,
        deactivateSearch,
        searchInput,
        setSearchInput,
        activeSearchQuery,
        setActiveSearchQuery,
        submitSearch,
        searchFocusNonce,
        requestSearchFocus,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
