/** @type {import('next').NextConfig} */
const nextConfig = {
  // @palava/db is a TS workspace package consumed as source.
  transpilePackages: ["@palava/db"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
