import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["undici"], // 🔥 punto cruciale per far funzionare Supabase in Vercel
};

export default nextConfig;
