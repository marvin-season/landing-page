import { isProduction } from "@/lib/constants";

const style = `
color:#fff;font-size:10px;font-weight:bold;border-radius:4px;padding:2px 4px;margin:2px 0;
background:linear-gradient(135deg, #12c2e9, #c471ed, #f64f59);
`;
// 带颜色打印，适配 Node.js (Server) 与浏览器 (Client)
export const logger = (...params: any[]) => {
  if (isProduction) return;

  const isClient = typeof window !== "undefined";

  if (isClient) {
    console.groupCollapsed(`%c[LOG]`, style, ...params);

    console.trace("trace");
    console.groupEnd();
  } else {
    // Node.js 环境
    console.log(`\x1b[32m[LOG]\x1b[0m \x1b[36m\x1b[0m`, ...params);
  }
};
