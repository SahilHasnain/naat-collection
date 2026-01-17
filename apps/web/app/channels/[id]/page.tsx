import { NaatCard } from "@/components/NaatCard";
import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChannelPage({ params }: PageProps) {
  const { id } = await params;

  let naats: Naat[] = [];
  let error: string | null = null;
  let channelName = "";

  try {
    naats = await appwriteService.getNaats(50, 0, "latest", id);
    if (naats.length > 0) {
      channelName = naats[0].channelName;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load naats";
    console.error("Error fetching naats:", err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <Link
          href="/channels"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          ← Back to Channels
        </Link>
        <h1 className="text-3xl font-bold mb-2">{channelName || "Channel"}</h1>
        <p className="text-gray-600">{naats.length} naats</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {naats.map((naat) => (
          <NaatCard key={naat.$id} naat={naat} />
        ))}
      </div>

      {naats.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">No naats found for this channel</p>
        </div>
      )}
    </div>
  );
}
