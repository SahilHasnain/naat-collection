/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: ["http://192.168.56.1:3000"],

  // Performance optimizations
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  optimizeFonts: true,

  // Exclude native modules from bundling (but NOT node-appwrite)
  serverExternalPackages: [
    "@ffmpeg-installer/ffmpeg",
    "fluent-ffmpeg",
  ],
};

export default nextConfig;
