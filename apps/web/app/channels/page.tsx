import { appwriteService } from "@/lib/appwrite";
import type { Channel } from "@naat-collection/shared";
import Link from "next/link";

export default async function ChannelsPage() {
  let channels: Channel[] = [];
  let error: string | null = null;

  try {
    channels = await appwriteService.getChannels();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load channels";
    console.error("Error fetching channels:", err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Channels</h1>
        <p className="text-gray-600">Browse naats by channel</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/channels/${channel.id}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600">
              {channel.name}
            </h3>
          </Link>
        ))}
      </div>

      {channels.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">No channels found</p>
        </div>
      )}
    </div>
  );
}
