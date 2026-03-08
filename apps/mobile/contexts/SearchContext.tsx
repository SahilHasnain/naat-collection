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
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

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
