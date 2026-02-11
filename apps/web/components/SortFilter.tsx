"use client";

export type SortOption = "forYou" | "latest" | "popular" | "oldest";

interface SortFilterProps {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  isMobile?: boolean;
}

export function SortFilter({
  selectedSort,
  onSortChange,
  isMobile = false,
}: SortFilterProps) {
  const filters: { value: SortOption; label: string; icon: string }[] = [
    { value: "forYou", label: "For You", icon: "✨" },
    { value: "latest", label: "Latest", icon: "🆕" },
    { value: "popular", label: "Popular", icon: "🔥" },
    { value: "oldest", label: "Oldest", icon: "📅" },
  ];

  // Mobile: Horizontal scrollable pills
  if (isMobile) {
    return (
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="overflow-x-auto px-4 py-3">
          <div className="flex gap-2 pb-1">
            {filters.map((filter) => {
              const isSelected = selectedSort === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => onSortChange(filter.value)}
                  className={`px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <span>{filter.icon}</span>
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Dropdown
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="sort-filter"
        className="text-gray-400 text-sm font-medium"
      >
        Sort:
      </label>
      <select
        id="sort-filter"
        value={selectedSort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 text-sm font-medium outline-none cursor-pointer hover:bg-gray-600 transition-colors"
      >
        {filters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.icon} {filter.label}
          </option>
        ))}
      </select>
    </div>
  );
}
