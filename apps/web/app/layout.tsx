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
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
