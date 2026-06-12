/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep pdf-parse out of webpack bundle — it uses fs/path at runtime
  experimental: { serverComponentsExternalPackages: ['pdf-parse'] },

  webpack: (config, { isServer }) => {
    // pdf-parse tries to load test files via require() at module init.
    // Stub them out so webpack doesn't choke during build.
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false

    if (!isServer) {
      // pdf-parse should never run in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
      }
    }

    return config
  },
}

export default nextConfig
