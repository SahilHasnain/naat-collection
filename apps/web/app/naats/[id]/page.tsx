import { appwriteService } from "@/lib/appwrite";
import {
  formatDuration,
  formatRelativeTime,
  formatViews,
} from "@naat-collection/shared";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NaatPage({ params }: PageProps) {
  const { id } = await params;

  let naat;
  try {
    naat = await appwriteService.getNaatById(id);
  } catch (error) {
    console.error("Error fetching naat:", error);
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${naat.youtubeId}`}
            title={naat.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Naat Info */}
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">{naat.title}</h1>

          <div className="flex items-center justify-between mb-6 pb-6 border-b">
            <div>
              <Link
                href={`/channels/${naat.channelId}`}
                className="text-lg font-semibold text-gray-900 hover:text-blue-600"
              >
                {naat.channelName}
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              {formatViews(naat.views)} views •{" "}
              {formatRelativeTime(naat.uploadDate)}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Duration</span>
              <p className="font-semibold">{formatDuration(naat.duration)}</p>
            </div>
            <div>
              <span className="text-gray-500">Upload Date</span>
              <p className="font-semibold">
                {new Date(naat.uploadDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Views</span>
              <p className="font-semibold">{formatViews(naat.views)}</p>
            </div>
            <div>
              <span className="text-gray-500">YouTube ID</span>
              <p className="font-semibold font-mono text-xs">
                {naat.youtubeId}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <a
              href={naat.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Watch on YouTube
            </a>
            {naat.audioId && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Play Audio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
