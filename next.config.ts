import type { NextConfig } from "next";
import { version as nextVersion } from "next/package.json";

// Next 15 calls this middleware; Next 16 renamed it to proxy.
// The wrong key is ignored and silently restores the 10 MB upload limit.
const uploadBodyLimit = Number(nextVersion.split(".")[0]) >= 16
  ? { proxyClientMaxBodySize: "100mb" as const }
  : { middlewareClientMaxBodySize: "100mb" as const };

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    ...uploadBodyLimit,
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'https://d1ckq51qwp5orx.cloudfront.net/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
