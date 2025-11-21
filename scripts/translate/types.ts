/**
 * 类型定义
 */

export interface ExportOptions {
  output: string; // 输出 CSV 文件路径
  provider?: string; // 翻译服务提供商
  apiKey?: string; // API 密钥
  appId?: string; // 百度翻译需要的 App ID
  sourceLang?: string; // 源语言代码（默认 'en'）
  localesDir?: string; // locales 目录路径（默认 'src/locales'）
}

export interface ImportOptions {
  csv: string; // CSV 文件路径
  po: string; // 目标 .po 文件路径
  localesDir?: string; // locales 目录路径（默认 'src/locales'）
}
