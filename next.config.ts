import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // One client-rendered screen. Films arrive as blobs from the booth through the proxy and
  // play from object URLs; nothing here needs next/image, so there is no `images` config.
  reactStrictMode: true,
};

export default nextConfig;
