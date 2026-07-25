import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  transpilePackages: ["maplibre-gl"],
};

export default nextConfig;
