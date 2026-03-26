'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function NaatRedirectPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const naatId = params.id as string;
    const youtubeId = searchParams.get('youtubeId');

    useEffect(() => {
        // Try to open in app
        const deepLink = `ubaidraza://naat/${naatId}${youtubeId ? `?youtubeId=${youtubeId}` : ''}`;

        // Attempt to open app
        window.location.href = deepLink;

        // Fallback to YouTube after 2 seconds if app doesn't open
        const timeout = setTimeout(() => {
            if (youtubeId) {
                window.location.href = `https://youtu.be/${youtubeId}`;
            } else {
                window.location.href = 'https://owaisrazaqadri.appwrite.network';
            }
        }, 2000);

        return () => clearTimeout(timeout);
    }, [naatId, youtubeId]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
            <div className="text-center max-w-md">
                <div className="mb-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                </div>

                <h1 className="text-2xl font-bold mb-4">Opening in App...</h1>
                <p className="text-gray-400 mb-8">
                    If the app doesn't open automatically, you'll be redirected to YouTube.
                </p>

                <div className="space-y-4">
                    <a
                        href={`ubaidraza://naat/${naatId}${youtubeId ? `?youtubeId=${youtubeId}` : ''}`}
                        className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                    >
                        📱 Open in App
                    </a>

                    {youtubeId && (
                        <a
                            href={`https://youtu.be/${youtubeId}`}
                            className="block w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                        >
                            ▶️ Watch on YouTube
                        </a>
                    )}

                    <div className="pt-4 border-t border-gray-800">
                        <p className="text-sm text-gray-500 mb-3">Don't have the app?</p>
                        <div className="flex gap-3 justify-center">
                            <a
                                href="https://play.google.com/store"
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Get on Android
                            </a>
                            <span className="text-gray-600">•</span>
                            <a
                                href="https://apps.apple.com"
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Get on iOS
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
