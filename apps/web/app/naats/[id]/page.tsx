import { appwriteService } from "@/lib/appwrite";
import { VideoPlayer } from "./VideoPlayer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NaatPage({ params }: PageProps) {
  const { id } = await params;

  // Try to fetch naat by YouTube ID (since we're navigating with youtubeId)
  const naat = await appwriteService.getNaatByYoutubeId(id);

  if (!naat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <span className="text-7xl mb-4 block">⚠️</span>
          <h1 className="text-2xl font-bold text-white mb-2">Naat Not Found</h1>
          <p className="text-neutral-400">
            The naat you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return <VideoPlayer naat={naat} />;
}
