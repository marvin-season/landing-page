import type { NextConfig } from "next";
import type { TurbopackRuleConfigCollection } from "next/dist/server/config-shared";


const rules: Record<string, TurbopackRuleConfigCollection> = {
  "*.po": {
      loaders: ["@lingui/loader"],
      as: "*.js",
    }
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    swcPlugins: [["@lingui/swc-plugin", {}]],
  },
  turbopack: {
    rules,
  },
  // ... 其他配置
  async rewrites() {
    return [
      {
        // 匹配所有以 /api-remote 开头的请求
        source: "/api-remote/:path*",
        // 转发到目标 HTTP 地址
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
