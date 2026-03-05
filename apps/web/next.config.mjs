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

  // Exclude native modules from bundling
  serverExternalPackages: [
    "@ffmpeg-installer/ffmpeg",
    "fluent-ffmpeg",
    "node-appwrite",
  ],

  // Ensure proper module resolution in monorepo
  experimental: {
    externalDir: true,
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure node-appwrite is treated as external on server
      config.externals = config.externals || [];
      config.externals.push('node-appwrite');
    }
    return config;
  },
};

export default nextConfig;
