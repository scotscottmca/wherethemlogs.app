import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  // Without this, Next walks up looking for a workspace root and can settle on
  // a parent directory that happens to hold a lockfile - which nests the
  // standalone output somewhere the Dockerfile is not looking.
  outputFileTracingRoot: projectRoot,
  // Standalone bundles the server and only the dependencies it actually uses,
  // which is what the container image copies.
  output: "standalone",
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "x-content-type-options", value: "nosniff" },
          { key: "referrer-policy", value: "strict-origin-when-cross-origin" },
          { key: "permissions-policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "cross-origin-opener-policy", value: "same-origin" },
          {
            key: "content-security-policy",
            value: [
              "default-src 'self'",
              // Next's hydration inlines its bootstrap payload. Google's tag
              // is only ever requested after an Accept (components/Consent.tsx).
              "script-src 'self' 'unsafe-inline' https://*.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.blob.core.windows.net https://*.google-analytics.com https://*.googletagmanager.com",
              "font-src 'self'",
              "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "cache-control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};
