import { appwriteService } from "@/lib/appwrite";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const sortBy = (searchParams.get("sortBy") || "latest") as
      | "latest"
      | "popular"
      | "oldest";
    const channelId = searchParams.get("channelId");
    const searchQuery = searchParams.get("search");

    // If there's a search query, use the search method
    if (searchQuery) {
      const naats = await appwriteService.searchNaats(searchQuery, channelId);
      // Apply pagination to search results
      const paginatedNaats = naats.slice(offset, offset + limit);
      return NextResponse.json(paginatedNaats);
    }

    // Otherwise, use the regular getNaats method
    const naats = await appwriteService.getNaats(
      limit,
      offset,
      sortBy,
      channelId,
    );

    return NextResponse.json(naats);
  } catch (error) {
    console.error("Error fetching naats:", error);
    return NextResponse.json(
      { error: "Failed to fetch naats" },
      { status: 500 },
    );
  }
}
