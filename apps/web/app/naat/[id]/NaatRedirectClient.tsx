"use client";

import { useEffect } from "react";

const APP_SCHEME = "ubaidraza";
const SHARE_BASE_URL = "https://owaisrazaqadri.appwrite.network";

export default function NaatRedirectClient({
  naatId,
  youtubeId,
}: {
  naatId: string;
  youtubeId?: string;
}) {
  const deepLink = `${APP_SCHEME}://naat/${naatId}${youtubeId ? `?youtubeId=${youtubeId}` : ""}`;

  useEffect(() => {
    window.location.href = deepLink;

    const timeout = setTimeout(() => {
      if (youtubeId) {
        window.location.href = `https://youtu.be/${youtubeId}`;
      } else {
        window.location.href = SHARE_BASE_URL;
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [deepLink, youtubeId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto" />
        </div>

        <h1 className="text-2xl font-bold mb-4">Opening in App...</h1>
        <p className="text-gray-400 mb-8">
          If the app does not open automatically, you will be redirected to YouTube.
        </p>

        <div className="space-y-4">
          <a
            href={deepLink}
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Open in App
          </a>

          {youtubeId ? (
            <a
              href={`https://youtu.be/${youtubeId}`}
              className="block w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Watch on YouTube
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
