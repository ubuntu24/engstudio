import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false, // Hide X-Powered-By header
  productionBrowserSourceMaps: false, // Hide source file paths (e.g. Navbar.tsx, api.ts) in DevTools
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || 'http://127.0.0.1:5000'}/api/:path*`,
      },
      {
        source: "/translate",
        destination: `${process.env.API_URL || 'http://127.0.0.1:5000'}/translate`,
      },
      {
        source: "/correct",
        destination: `${process.env.API_URL || 'http://127.0.0.1:5000'}/correct`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development'
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:* https:; frame-src 'self' https://www.youtube.com; media-src 'self' https: http: data: blob:;"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self' https: http: ws: wss:; frame-src 'self' https://www.youtube.com; media-src 'self' https: http: data: blob:;",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
