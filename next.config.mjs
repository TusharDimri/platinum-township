/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow large static assets (GLB model)
  experimental: {
    largePageDataBytes: 512 * 1024,
  },
  // Increase static file serving limits
  staticPageGenerationTimeout: 300,
  // Turbopack config (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
