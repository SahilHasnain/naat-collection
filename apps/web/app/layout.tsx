import { ResponsivePlayer } from "@/components/ResponsivePlayer";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naat Collection - Owais Raza Qadri",
  description: "Browse and listen Naats recited by Owais Raza Qadri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-900">
        <AudioPlayerProvider>
          <main>{children}</main>
          <ResponsivePlayer />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
