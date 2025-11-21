/**
 * 导出命令：将所有语言的翻译条目导出到 CSV
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { parsePOFile, type POFile } from "../lib/po-parser";
import { createTranslator } from "../lib/translator";
import {
  exportToMultiLangCSV,
  readExistingCSV,
  unescapeCSVField,
} from "../lib/csv-handler";
import { getAllPOFiles, getLangFromFilename } from "../utils";
import type { ExportOptions } from "../types";

export async function exportTranslations(options: ExportOptions) {
  const {
    output,
    provider,
    apiKey,
    appId,
    sourceLang = "en",
    localesDir = "src/locales",
  } = options;

  const localesPath = join(process.cwd(), localesDir);
  if (!existsSync(localesPath)) {
    throw new Error(`Locales directory not found: ${localesPath}`);
  }

  // 获取所有 .po 文件
  const poFiles = getAllPOFiles(localesPath);
  console.log(`Found ${poFiles.length} PO files: ${poFiles.join(", ")}`);

  // 读取所有 .po 文件
  const poDataMap = new Map<string, POFile>();
  const languages: string[] = [];

  for (const poFile of poFiles) {
    const lang = getLangFromFilename(poFile);
    const filePath = join(localesPath, poFile);
    const content = readFileSync(filePath, "utf-8");
    const poFileData = parsePOFile(content);
    poDataMap.set(lang, poFileData);
    languages.push(lang);
  }

  // 以 msgid 为 key 合并所有语言的翻译
  const entriesList: Array<{
    msgid: string;
    entry: { comments: string[]; msgid: string; msgstr: string };
    translations: Record<string, string>;
  }> = [];

  // 首先从源语言（通常是 en）获取所有 msgid
  const sourcePO = poDataMap.get(sourceLang);
  if (!sourcePO) {
    throw new Error(`Source language file not found: ${sourceLang}.po`);
  }

  // 收集所有 msgid（以源语言为准），保持顺序
  for (const entry of sourcePO.entries) {
    if (entry.msgid && entry.msgid !== "") {
      entriesList.push({
        msgid: entry.msgid,
        entry: {
          comments: entry.comments,
          msgid: entry.msgid,
          msgstr: entry.msgstr,
        },
        translations: {},
      });
    }
  }

  // 创建 msgid 到条目的映射（用于快速查找）
  const entriesMap = new Map<
    string,
    {
      entry: { comments: string[]; msgid: string; msgstr: string };
      translations: Record<string, string>;
    }
  >();
  for (const item of entriesList) {
    // 如果 msgid 已存在，保留第一个（保持原始注释）
    if (!entriesMap.has(item.msgid)) {
      entriesMap.set(item.msgid, item);
    }
  }

  // 填充各语言的翻译
  for (const lang of languages) {
    const poData = poDataMap.get(lang);
    if (!poData) continue;

    // 创建 msgid 到 msgstr 的映射
    const langTranslations = new Map<string, string>();
    for (const entry of poData.entries) {
      if (entry.msgid && entry.msgid !== "") {
        langTranslations.set(entry.msgid, entry.msgstr || "");
      }
    }

    // 填充到 entriesMap
    for (const [msgid, data] of entriesMap.entries()) {
      data.translations[lang] = langTranslations.get(msgid) || "";
    }
  }

  // 如果需要自动翻译缺失的翻译
  if (provider && apiKey) {
    console.log(`Translating missing translations using ${provider}...`);

    // 找出需要翻译的语言（除了源语言）
    const targetLangs = languages.filter((lang) => lang !== sourceLang);

    for (const targetLang of targetLangs) {
      console.log(`Translating to ${targetLang}...`);
      const translator = createTranslator({
        provider: provider as any,
        apiKey,
        sourceLang,
        targetLang: targetLang,
        appId,
      });

      // 找出需要翻译的条目（msgstr 为空）
      const textsToTranslate: string[] = [];
      const msgidsToTranslate: string[] = [];

      for (const [msgid, data] of entriesMap.entries()) {
        if (
          !data.translations[targetLang] ||
          data.translations[targetLang] === ""
        ) {
          const sourceText = data.translations[sourceLang] || msgid;
          if (sourceText) {
            textsToTranslate.push(sourceText);
            msgidsToTranslate.push(msgid);
          }
        }
      }

      if (textsToTranslate.length > 0) {
        console.log(
          `Found ${textsToTranslate.length} entries to translate for ${targetLang}`,
        );

        // 批量翻译
        const batchSize = 50;
        for (let i = 0; i < textsToTranslate.length; i += batchSize) {
          const batch = textsToTranslate.slice(i, i + batchSize);
          const batchMsgids = msgidsToTranslate.slice(i, i + batchSize);
          console.log(
            `Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(textsToTranslate.length / batchSize)}...`,
          );

          try {
            const batchResults = await translator.translateBatch(batch);
            // 更新翻译结果
            for (let j = 0; j < batchMsgids.length; j++) {
              const msgid = batchMsgids[j];
              const translation = batchResults[j] || "";
              const data = entriesMap.get(msgid);
              if (data) {
                data.translations[targetLang] = translation;
              }
            }
            // 添加延迟，避免 API 速率限制
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error translating batch: ${error}`);
          }
        }
      }
    }
  }

  // 检查是否需要读取现有 CSV 并合并
  const outputPath = join(process.cwd(), output);
  let existingData: { headers: string[]; rows: Map<string, string[]> } | null =
    null;

  if (existsSync(outputPath)) {
    console.log("Reading existing CSV file to merge...");
    const existingContent = readFileSync(outputPath, "utf-8");
    existingData = readExistingCSV(existingContent);
  }

  // 如果存在现有 CSV，保留其中的翻译（优先使用 CSV 中的值）
  if (existingData && existingData.headers.length > 0) {
    const existingHeaders = existingData.headers;
    const msgidIndex = existingHeaders.indexOf("msgId");

    if (msgidIndex !== -1) {
      for (const [msgid, row] of existingData.rows.entries()) {
        const data = entriesMap.get(msgid);
        if (data) {
          // 保留现有 CSV 中各语言的翻译
          for (let i = 2; i < existingHeaders.length; i++) {
            const lang = existingHeaders[i];
            if (lang && row[i]) {
              const existingTranslation = unescapeCSVField(row[i]);
              if (existingTranslation) {
                data.translations[lang] = existingTranslation;
              }
            }
          }
        }
      }
    }
  }

  // 导出到 CSV（使用 entriesList 保持顺序，确保每个 msgid 使用对应的注释）
  const csvContent = exportToMultiLangCSV(entriesList, entriesMap, languages);

  // 确保输出目录存在
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, csvContent, "utf-8");

  console.log(
    `Exported ${entriesMap.size} entries with ${languages.length} languages to ${outputPath}`,
  );
}
