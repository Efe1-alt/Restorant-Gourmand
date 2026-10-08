import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    // Static export няма сървър, който да оптимизира снимки при заявка —
    // next/image просто рендва <img> с оригиналния src.
    unoptimized: true,
  },
};

export default nextConfig;
