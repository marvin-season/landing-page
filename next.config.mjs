const rules = {
  "*.po": {
    loaders: ["@lingui/loader"],
    as: "*.js",
  },
};

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactCompiler: true,
  experimental: {
    swcPlugins: [["@lingui/swc-plugin", {}]],
  },
  turbopack: {
    rules,
  },
  async rewrites() {
    return [
      {
        source: "/api-remote/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`,
      },
      {
        source: "/api-agent/:path*",
        destination: "http://localhost:7777/:path*",
      },
    ];
  },
};

export default nextConfig;
