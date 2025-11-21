/**
 * 工具函数
 */

import { existsSync, readdirSync } from "fs";

/**
 * 获取所有 .po 文件
 */
export function getAllPOFiles(localesDir: string): string[] {
  const files = readdirSync(localesDir);
  return files.filter((file) => file.endsWith(".po"));
}

/**
 * 从文件名提取语言代码
 */
export function getLangFromFilename(filename: string): string {
  return filename.replace(".po", "");
}

/**
 * 转义字符串用于正则表达式
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 转义字符串用于 .po 文件（msgstr 值）
 */
export function escapePOString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}
