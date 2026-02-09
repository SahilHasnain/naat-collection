"use client";

import type { Channel } from "@naat-collection/shared";

interface ChannelFilterProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelChange: (channelId: string | null) => void;
  loading?: boolean;
  isMobile?: boolean;
}

export function ChannelFilter({
  channels,
  selectedChannelId,
  onChannelChange,
  loading = false,
  isMobile = false,
}: ChannelFilterProps) {
  // Separate channels into main and "other"
  const mainChannels = channels.filter((ch) => !ch.isOther);
  const otherChannels = channels.filter((ch) => ch.isOther);

  // Sort main channels alphabetically by name
  const sortedMainChannels = [...mainChannels].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Check if "Other" is selected (when selectedChannelId matches any other channel)
  const isOtherSelected =
    selectedChannelId !== null &&
    otherChannels.some((ch) => ch.id === selectedChannelId);

  // Mobile: Horizontal scrollable pills
  if (isMobile) {
    const filterOptions = [
      { id: null, name: "All", icon: "🌐", type: "all" as const },
      ...sortedMainChannels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        icon: "📺",
        type: "channel" as const,
      })),
    ];

    // Add "Other" option if there are other channels
    if (otherChannels.length > 0) {
      filterOptions.push({
        id: "other",
        name: "Other",
        icon: "📂",
        type: "other" as const,
      });
    }

    return (
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="overflow-x-auto px-4 py-3">
          <div className="flex gap-2 pb-1">
            {filterOptions.map((option) => {
              const isSelected =
                option.type === "other"
                  ? isOtherSelected
                  : selectedChannelId === option.id;

              return (
                <button
                  key={option.id || "all"}
                  onClick={() => {
                    if (option.type === "other" && otherChannels.length > 0) {
                      // Select the first "other" channel
                      onChannelChange(otherChannels[0].id);
                    } else {
                      onChannelChange(option.id);
                    }
                  }}
                  disabled={loading}
                  className={`px-4 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <span>{option.icon}</span>
                  {option.name}
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
        htmlFor="channel-filter"
        className="text-gray-400 text-sm font-medium"
      >
        Channel:
      </label>
      <select
        id="channel-filter"
        value={isOtherSelected ? "other" : selectedChannelId || ""}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "other" && otherChannels.length > 0) {
            // Select the first "other" channel
            onChannelChange(otherChannels[0].id);
          } else {
            onChannelChange(value || null);
          }
        }}
        disabled={loading}
        className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 text-sm font-medium outline-none cursor-pointer hover:bg-gray-600 transition-colors"
      >
        <option value="">🌐 All Channels</option>
        {sortedMainChannels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            📺 {channel.name}
          </option>
        ))}
        {otherChannels.length > 0 && <option value="other">📂 Other</option>}
      </select>
    </div>
  );
}
