/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // self-contained server output for easy Docker/VPS deploy (.next/standalone)
  output: "standalone",
  poweredByHeader: false, // don't advertise the stack
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
