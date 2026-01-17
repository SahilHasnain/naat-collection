"use client";

import { SearchBar } from "./SearchBar";

export function Hero() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            Discover Beautiful Islamic Naats
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Listen to devotional songs by Owais Raza Qadri and more
          </p>
        </div>
        <div className="flex justify-center">
          <SearchBar />
        </div>
      </div>
    </div>
  );
}
