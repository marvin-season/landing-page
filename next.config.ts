import type { NextConfig } from "next";
import type { TurbopackRuleConfigCollection } from "next/dist/server/config-shared";
import { locales } from "./src/lib/i18n/locales";

const rules: Record<string, TurbopackRuleConfigCollection> = {
  "*.po": {
    loaders: ["@lingui/loader"],
    as: "*.js",
  },
  "**/*.{tsx,jsx}": {
    loaders: [
      {
        loader: "@locator/webpack-loader",
        options: {
          env: "development",
        },
      },
    ],
  },
};

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: [
    "@landing-page/biz-ui",
    "@landing-page/design-system",
    "@landing-page/utils",
  ],
  experimental: {
    optimizePackageImports: [
      "@landing-page/biz-ui",
      "@landing-page/design-system",
    ],
    swcPlugins: [["@lingui/swc-plugin", {}]],
    useTypeScriptCli: true,
  },
  turbopack: {
    rules,
  },
  async headers() {
    return [
      {
        source: "/bbq-pwa/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin/bbq/:path*",
        destination: "/zh/bookkeeping/:path*",
        permanent: true,
      },
      ...locales.map((locale) => ({
        source: `/${locale}/admin/bbq/:path*`,
        destination: `/${locale}/bookkeeping/:path*`,
        permanent: true,
      })),
    ];
  },
  // ... 其他配置
  async rewrites() {
    return [
      {
        source: "/saltline-fable-5.2",
        destination: "/saltline-fable-5.2/index.html",
      },
    ];
  },
};

export default nextConfig;
