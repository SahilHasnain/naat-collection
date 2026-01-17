import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";
import { formatRelativeTime, formatViews } from "@naat-collection/shared";

export default async function Home() {
  let naats: Naat[] = [];
  let error: string | null = null;

  try {
    naats = await appwriteService.getNaats(20, 0, "latest");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load naats";
    console.error("Error fetching naats:", err);
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Naat Collection</h1>
        <p className="text-gray-600">Naats recited by Owais Raza Qadri</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {naats.map((naat) => (
          <div
            key={naat.$id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="relative aspect-video">
              <img
                src={naat.thumbnailUrl}
                alt={naat.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {naat.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{naat.channelName}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatViews(naat.views)} views</span>
                <span>{formatRelativeTime(naat.uploadDate)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {naats.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">No naats found</p>
        </div>
      )}
    </div>
  );
}
