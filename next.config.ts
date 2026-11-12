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
  [
    "'self'",
    // Hosted preview/embed surfaces. `*.arena.site` is the domain arena hands out
    // for shareable previews — omitting it makes the preview iframe refuse to load,
    // which presents as "the site won't open" and "can't sign in".
    "https://arena.ai",
    "https://*.arena.ai",
    "https://arena.com",
    "https://*.arena.com",
    "https://arena.site",
    "https://*.arena.site",
    "https://*.e2b.app",
    "https://*.e2b.dev",
    "https://*.vercel.app",
    // Local development / preview shells (ports are arbitrary).
    "http://localhost:*",
    "http://127.0.0.1:*",
  ].join(" ");

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
  /**
   * Product photography is served through Next's optimizer: AVIF/WebP, sized per
   * viewport, long-lived immutable cache. Originals are 111 KB JPEGs shown at
   * ~200px on a card, so this is the single biggest transfer win available.
   */
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [96, 160, 240, 320, 420, 640, 828, 1080, 1280, 1600],
    imageSizes: [48, 64, 96, 128, 160, 200, 256, 320],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["@/components/icons"],
  },
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
