import React, { createContext, useContext, useState } from "react";

interface FilterModalContextType {
  showFilterModal: boolean;
  setShowFilterModal: (show: boolean) => void;
}

const FilterModalContext = createContext<FilterModalContextType | undefined>(
  undefined,
);

export function FilterModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  return (
    <FilterModalContext.Provider
      value={{ showFilterModal, setShowFilterModal }}
    >
      {children}
    </FilterModalContext.Provider>
  );
}

export function useFilterModal() {
  const context = useContext(FilterModalContext);
  if (context === undefined) {
    throw new Error("useFilterModal must be used within a FilterModalProvider");
  }
  return context;
}
