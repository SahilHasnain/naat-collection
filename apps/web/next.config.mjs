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

  // Optimize production builds
  swcMinify: true,

  // Enable compression
  compress: true,

  // Optimize fonts
  optimizeFonts: true,
};

export default nextConfig;
