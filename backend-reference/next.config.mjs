/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure native/server-only deps aren't bundled into route handlers.
  serverExternalPackages: ['@prisma/client', 'bullmq', 'ioredis'],
};

export default nextConfig;
