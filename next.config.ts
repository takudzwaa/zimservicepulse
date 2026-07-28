import type { NextConfig } from "next";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// MapLibre GL v6 builds a blob worker via `new URL(dynamicPath, import.meta.url)`.
// Turbopack statically resolves `new URL(...)` and fails with "Can't resolve <dynamic>".
// HotspotMap always calls setWorkerUrl() with a same-origin absolute path, so that
// helper never runs at runtime — rewrite it to a no-op resolution of the path string.
const maplibreDynamicUrlRule = {
  loaders: [
    {
      loader: require.resolve("string-replace-loader"),
      options: {
        search: "new URL(e,import.meta.url).href",
        // Absolute/same-origin worker URLs (our setWorkerUrl path) pass through as-is.
        replace: "e",
      },
    },
  ],
  as: "*.js",
};

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@electric-sql/pglite"],
  transpilePackages: ["maplibre-gl"],
  turbopack: {
    rules: {
      "**/maplibre-gl/dist/maplibre-gl.mjs": maplibreDynamicUrlRule,
      "**/maplibre-gl/dist/maplibre-gl-dev.mjs": maplibreDynamicUrlRule,
    },
  },
  webpack: (config) => {
    // Keep webpack builds aligned with the Turbopack rewrite above.
    config.module.rules.push({
      test: /maplibre-gl(?:-dev)?\.mjs$/,
      enforce: "pre",
      use: [
        {
          loader: require.resolve("string-replace-loader"),
          options: {
            search: "new URL(e,import.meta.url).href",
            replace: "e",
          },
        },
      ],
    });
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
