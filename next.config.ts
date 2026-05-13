import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maptailer.hel1.your-objectstorage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
