"use client";

import { useEffect, useState } from "react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
const ADMIN_AUTH_STORAGE_KEY = "admin_password_verified";

interface PinProtectionProps {
  children: React.ReactNode;
}

export default function PinProtection({ children }: PinProtectionProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already verified in this session
    const verified = sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    if (verified === "true") {
      setIsVerified(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
      setIsVerified(true);
      setError("");
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Admin Access
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter password
              </label>
              <input
                type="password"
                maxLength={10}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white text-center text-lg tracking-[0.2em]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-400">
                Supports up to 10 mixed characters.
              </p>
            </div>

            {error && (
              <div className="mb-4 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
