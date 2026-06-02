/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Sometimes helps with double-invoke in dev
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  env: {
    // Note: Do NOT put GEMINI_API_KEY here if you want it strictly server-side.
    // Use .env.local for secrets.
  },
};

export default nextConfig;