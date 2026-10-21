import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    // Dish photos are already sized WebP files in Supabase Storage, so they
    // are served as they are (no optimiser, no extra cost per image).
    unoptimized: true,
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/**`)]
      : [],
  },
  experimental: {
    // Several root layouts (BG site, EN site, admin) need one global 404.
    globalNotFound: true,
    // Dish photos (up to 5 MB) are uploaded through an admin Server Action.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Private pages: never cached, never indexed.
        source: "/(admin|porachka/status|en/order/status)/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
