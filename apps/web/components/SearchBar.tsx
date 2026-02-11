"use client";

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  isMobile?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search naats...",
  isMobile = false,
}: SearchBarProps) {
  const handleClear = () => {
    onChangeText("");
  };

  // Mobile: Compact dark theme
  if (isMobile) {
    return (
      <div className="flex items-center bg-gray-700 rounded-lg px-3 py-2 border border-gray-600">
        <span className="mr-2 text-base">🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-400"
        />
        {value.length > 0 && (
          <button
            onClick={handleClear}
            className="ml-2 bg-gray-600 rounded-full px-2 py-1 text-xs text-gray-200 hover:bg-gray-500 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Desktop: Larger with more padding
  return (
    <div className="flex items-center bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 max-w-2xl mx-auto">
      <span className="mr-3 text-lg">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white outline-none placeholder:text-gray-400"
      />
      {value.length > 0 && (
        <button
          onClick={handleClear}
          className="ml-3 bg-gray-600 rounded-full px-3 py-1 text-sm text-gray-200 hover:bg-gray-500 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}
