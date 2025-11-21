/**
 * CSV 文件处理工具
 * 用于导出翻译条目到 CSV，以及从 CSV 导入翻译结果
 *
 * CSV 格式：#: | msgId | en | zh | ja | ...
 */

import type { POEntry } from "./po-parser";

export interface MultiLangCSVRow {
  comments: string; // #: 注释信息
  msgid: string;
  [lang: string]: string; // 动态语言列：en, zh, ja 等
}

/**
 * 将多个语言的 PO 条目合并导出为 CSV 格式
 * @param entriesList 条目列表（保持顺序，每个条目包含自己的注释）
 * @param entriesMap 以 msgid 为 key 的条目映射，值为各语言的翻译（用于查找翻译）
 * @param languages 语言列表，如 ['en', 'zh', 'ja']
 */
export function exportToMultiLangCSV(
  entriesList: Array<{
    msgid: string;
    entry: { comments: string[]; msgid: string; msgstr: string };
  }>,
  entriesMap: Map<string, { translations: Record<string, string> }>,
  languages: string[],
): string {
  // 生成表头：#: | msgId | en | zh | ja | ...
  const headers = ["#:", "msgId", ...languages];

  // 生成数据行（按 entriesList 的顺序，每个条目使用自己的注释）
  const rows: string[] = [];
  for (const item of entriesList) {
    const { msgid, entry } = item;
    // 从 entriesMap 获取翻译（如果存在）
    const data = entriesMap.get(msgid);
    const translations = data?.translations || {};

    // 处理注释信息：保留 "#:" 前缀，只取第一个源文件位置注释
    // 使用当前条目的注释，而不是从 entriesMap 获取
    let comments = "";
    for (const comment of entry.comments) {
      // 只处理源文件位置注释（以 "#:" 开头）
      if (comment.trim().startsWith("#:")) {
        // 保留原值，包括 "#:" 前缀
        comments = comment.trim();
        break; // 只取第一个注释位置
      }
    }

    const row = [
      escapeCSVField(comments),
      escapeCSVField(msgid),
      ...languages.map((lang) => escapeCSVField(translations[lang] || "")),
    ];
    rows.push(row.join(","));
  }

  return [headers.join(","), ...rows].join("\n");
}

/**
 * 从 CSV 文件读取指定语言的翻译结果
 * @param csvContent CSV 文件内容
 * @param targetLang 目标语言代码，如 'zh', 'ja'
 */
export function importFromCSV(
  csvContent: string,
  targetLang: string,
): Map<string, string> {
  const lines = csvContent.split("\n").filter((line) => line.trim() !== "");
  const result = new Map<string, string>();

  // 解析表头
  const headerLine = lines[0];
  if (!headerLine) {
    return result;
  }

  const headers = parseCSVLine(headerLine);
  const msgidIndex = headers.indexOf("msgId");
  const langIndex = headers.indexOf(targetLang);

  if (msgidIndex === -1) {
    throw new Error('CSV file must contain "msgId" column');
  }

  if (langIndex === -1) {
    throw new Error(`CSV file does not contain language column: ${targetLang}`);
  }

  // 解析数据行
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length > Math.max(msgidIndex, langIndex)) {
      const msgid = unescapeCSVField(fields[msgidIndex]);
      const translation = unescapeCSVField(fields[langIndex]);
      if (msgid) {
        // 即使翻译为空也记录（可能是需要翻译的条目）
        result.set(msgid, translation || "");
      }
    }
  }

  return result;
}

/**
 * 读取现有 CSV 文件（如果存在），用于合并更新
 */
export function readExistingCSV(csvContent: string): {
  headers: string[];
  rows: Map<string, string[]>; // msgid -> [comments, msgid, en, zh, ja, ...]
} {
  const lines = csvContent.split("\n").filter((line) => line.trim() !== "");
  const result = new Map<string, string[]>();

  if (lines.length === 0) {
    return { headers: [], rows: result };
  }

  const headers = parseCSVLine(lines[0]);
  const msgidIndex = headers.indexOf("msgId");

  if (msgidIndex === -1) {
    return { headers, rows: result };
  }

  // 解析数据行
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length > msgidIndex) {
      const msgid = unescapeCSVField(fields[msgidIndex]);
      if (msgid) {
        result.set(msgid, fields);
      }
    }
  }

  return { headers, rows: result };
}

/**
 * 转义 CSV 字段
 */
export function escapeCSVField(field: string): string {
  // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * 反转义 CSV 字段
 */
export function unescapeCSVField(field: string): string {
  // 移除首尾引号（如果存在）
  if (field.startsWith('"') && field.endsWith('"')) {
    field = field.slice(1, -1);
    // 还原转义的引号
    field = field.replace(/""/g, '"');
  }
  return field;
}

/**
 * 解析 CSV 行（处理引号内的逗号）
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的引号
        currentField += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // 字段分隔符
      fields.push(currentField);
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // 添加最后一个字段
  fields.push(currentField);

  return fields;
}
