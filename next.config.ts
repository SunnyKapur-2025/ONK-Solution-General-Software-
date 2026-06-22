import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ]
  },
}

export default nextConfig
