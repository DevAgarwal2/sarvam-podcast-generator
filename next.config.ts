import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dashboard.sarvam.ai',
        pathname: '/assets/**',
      },
    ],
  },
};

export default nextConfig;
