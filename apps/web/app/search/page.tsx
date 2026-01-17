import { NaatCard } from "@/components/NaatCard";
import { SearchBar } from "@/components/SearchBar";
import { appwriteService } from "@/lib/appwrite";
import type { Naat } from "@naat-collection/shared";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";

  let naats: Naat[] = [];
  let error: string | null = null;
  let isSearching = false;

  if (query.trim()) {
    isSearching = true;
    try {
      naats = await appwriteService.searchNaats(query);
    } catch (err) {
      error = err instanceof Error ? err.message : "Search failed";
      console.error("Error searching naats:", err);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Search Naats</h1>
        <SearchBar />
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {isSearching && (
        <>
          <div className="mb-6">
            <p className="text-gray-600">
              {naats.length > 0
                ? `Found ${naats.length} result${naats.length === 1 ? "" : "s"} for "${query}"`
                : `No results found for "${query}"`}
            </p>
          </div>

          {naats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {naats.map((naat) => (
                <NaatCard key={naat.$id} naat={naat} />
              ))}
            </div>
          )}

          {naats.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No naats found matching your search.
              </p>
              <p className="text-sm text-gray-400">
                Try different keywords or check your spelling.
              </p>
            </div>
          )}
        </>
      )}

      {!isSearching && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-gray-500 mb-2">Start searching for naats</p>
          <p className="text-sm text-gray-400">
            Enter keywords to find your favorite naats
          </p>
        </div>
      )}
    </div>
  );
}
