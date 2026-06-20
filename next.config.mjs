/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // self-contained server output for easy Docker/VPS deploy (.next/standalone)
  output: "standalone",
};

export default nextConfig;
