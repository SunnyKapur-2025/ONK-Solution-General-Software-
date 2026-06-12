import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: { serverComponentsExternalPackages: ['pdf-parse'] },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
