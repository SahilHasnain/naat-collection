import { Hero } from "@/components/Hero";
import { NaatCard } from "@/components/NaatCard";
import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";

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
    <>
      <Hero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Latest Naats</h2>
          <p className="text-gray-600">Recently uploaded devotional songs</p>
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
            <p className="text-gray-500">No naats found</p>
          </div>
        )}
      </div>
    </>
  );
}
