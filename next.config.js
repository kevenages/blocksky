/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add your Next.js configurations here
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.bsky.app',
        port: '',
        pathname: '/img/**',
      },
    ],
  },
};

module.exports = nextConfig;