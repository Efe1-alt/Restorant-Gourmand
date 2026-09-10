import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    // Static export няма сървър, който да оптимизира снимки при заявка —
    // next/image просто рендва <img> с оригиналния src.
    unoptimized: true,
    remotePatterns: [
      // Временен hero placeholder от Unsplash (виж src/components/Hero.tsx).
      // Премахни, след като реалната снимка от Hemingway е готова.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
