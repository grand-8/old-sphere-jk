// Next.js 16 uses Turbopack by default for both `next dev` and `next build`
// No additional configuration needed - Turbopack is enabled automatically

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
