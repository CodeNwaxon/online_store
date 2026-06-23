import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    minimumCacheTTL: 2678400, // 31 days
    formats: ['image/webp'], // Use only WebP to reduce transformations
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // TODO: For further optimization, restrict '**' to your actual image domains (e.g. firebasestorage.googleapis.com)
      },
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
