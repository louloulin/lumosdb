/** @type {import('next').NextConfig} */
// Import next-pwa dynamically to avoid ESLint error
const withPWA = (() => {
  try {
    return require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
    })
  } catch (e) {
    return (config) => config
  }
})()

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
    // Disable strict mode for rules to allow more flexible code patterns
    dirs: ['pages', 'components', 'lib', 'utils', 'hooks', 'app', 'config'],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    // Correctly configure turbo as an object instead of a boolean
    turbo: {
      enabled: false,
    },
  },
}

module.exports = withPWA(nextConfig)
