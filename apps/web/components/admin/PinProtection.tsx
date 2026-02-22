"use client";

import { useEffect, useState } from "react";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234"; // Fallback to 1234 if not set
const PIN_STORAGE_KEY = "admin_pin_verified";

interface PinProtectionProps {
  children: React.ReactNode;
}

export default function PinProtection({ children }: PinProtectionProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already verified in this session
    const verified = sessionStorage.getItem(PIN_STORAGE_KEY);
    if (verified === "true") {
      setIsVerified(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(PIN_STORAGE_KEY, "true");
      setIsVerified(true);
      setError("");
    } else {
      setError("Incorrect PIN");
      setPin("");
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
                Enter PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white text-center text-2xl tracking-widest"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
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
