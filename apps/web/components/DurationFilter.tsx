"use client";

import type { DurationOption } from "@naat-collection/shared";

interface DurationFilterProps {
  selectedDuration: DurationOption;
  onDurationChange: (duration: DurationOption) => void;
  isMobile?: boolean;
}

export function DurationFilter({
  selectedDuration,
  onDurationChange,
  isMobile = false,
}: DurationFilterProps) {
  const filters: { value: DurationOption; label: string; icon: string }[] = [
    { value: "all", label: "All", icon: "⏱️" },
    { value: "short", label: "< 5 min", icon: "⚡" },
    { value: "medium", label: "5-15 min", icon: "⏳" },
    { value: "long", label: "> 15 min", icon: "📺" },
  ];

  // Mobile: Horizontal scrollable pills
  if (isMobile) {
    return (
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="overflow-x-auto px-4 py-3">
          <div className="flex gap-2 pb-1">
            {filters.map((filter) => {
              const isSelected = selectedDuration === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => onDurationChange(filter.value)}
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
        htmlFor="duration-filter"
        className="text-gray-400 text-sm font-medium"
      >
        Duration:
      </label>
      <select
        id="duration-filter"
        value={selectedDuration}
        onChange={(e) => onDurationChange(e.target.value as DurationOption)}
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
