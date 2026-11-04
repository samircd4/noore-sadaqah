import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

const apiMode = process.env.API_MODE || "mock";
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

/** Image hosts next/image may load. Placeholder hosts only outside live mode (docs/ARCHITECTURE.md "API modes"). */
const remotePatterns = [
  ...(mediaHost ? [{ protocol: "https", hostname: mediaHost }] : []),
  ...(apiMode !== "live" ? [{ protocol: "https", hostname: "images.unsplash.com" }] : []),
];

/** Baseline security headers. The full CSP comes later (docs/SECURITY.md §8). */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone", // docs/DEPLOYMENT.md: run with node .next/standalone/server.js on the VPS
  poweredByHeader: false,
  images: { remotePatterns },
  // The repo root, so CSS can import ../design/tokens.css from outside frontend/.
  turbopack: {
    root: fileURLToPath(new URL("..", import.meta.url)),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
