import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ar-js-org/ar.js', 'three'],
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  async headers() {
    return [
      {
        source: '/models/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/models/(.*).glb',
        headers: [
          {
            key: 'Content-Type',
            value: 'model/gltf-binary',
          },
        ],
      },
      {
        source: '/models/(.*).usdz',
        headers: [
          {
            key: 'Content-Type',
            value: 'model/vnd.usdz+zip',
          },
        ],
      },
      {
        source: '/data/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
