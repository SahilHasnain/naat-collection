"use client";

import type { Naat } from "@naat-collection/shared";
import {
  formatDuration,
  formatRelativeTime,
  formatViews,
} from "@naat-collection/shared";
import Link from "next/link";

interface NaatCardProps {
  naat: Naat;
}

export function NaatCard({ naat }: NaatCardProps) {
  return (
    <Link href={`/naats/${naat.$id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative aspect-video">
          <img
            src={naat.thumbnailUrl}
            alt={naat.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {formatDuration(naat.duration)}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-blue-600">
            {naat.title}
          </h3>
          <Link
            href={`/channels/${naat.channelId}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 block"
            onClick={(e) => e.stopPropagation()}
          >
            {naat.channelName}
          </Link>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatViews(naat.views)} views</span>
            <span>{formatRelativeTime(naat.uploadDate)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
