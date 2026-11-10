import type { NextConfig } from "next";

/**
 * Production defaults:
 * - `standalone` keeps the runtime image small (used by the Dockerfile).
 * - Security headers are applied here so they hold even without the edge proxy.
 * - CSP allows the inline bootstrap Next.js needs but nothing third-party.
 *
 * Framing policy: hosted preview environments (arena.ai, e2b.app) render the app
 * inside an iframe, so `frame-ancestors 'none'` / `X-Frame-Options: DENY` makes the
 * preview go blank. The allow-list below permits only those preview origins plus
 * same-origin. On a real domain set FRAME_ANCESTORS="'self'" (or "'none'") in the
 * environment to lock framing down completely.
 */
const frameAncestors =
  process.env.FRAME_ANCESTORS?.trim() ||
  "'self' https://arena.ai https://*.arena.ai https://arena.com https://*.arena.com https://*.e2b.app https://*.e2b.dev https://*.vercel.app";

// X-Frame-Options cannot express an allow-list; it is only safe while framing is
// limited to same-origin. When extra ancestors are allowed we rely on CSP (which
// every current browser enforces) and omit the legacy header entirely.
const allowExternalFraming = !/^'?(self|none)'?$/i.test(frameAncestors.replace(/'/g, "").trim());

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // SAMEORIGIN only when external preview origins are not being framed.
  ...(allowExternalFraming ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  // `same-origin` severs window.opener, which some embedded previews rely on.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self'",
      "form-action 'self'",
      `frame-ancestors ${frameAncestors}`,
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
