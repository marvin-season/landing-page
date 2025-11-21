#!/usr/bin/env node
/**
 * 翻译工具 CLI 入口
 *
 * 使用方式：
 * 1. 导出所有语言到 CSV: export --output translations.csv [--provider <provider>] [--apiKey <key>]
 * 2. 从 CSV 导入指定语言: import --csv translations.csv --po zh.po
 */

import { exportTranslations } from "./commands/export";
import { importTranslations } from "./commands/import";
import type { ExportOptions, ImportOptions } from "./types";

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "export") {
    // 解析导出参数
    const options: Partial<ExportOptions> = {};
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i]?.replace("--", "");
      const value = args[i + 1];
      if (key && value) {
        (options as any)[key] = value;
      }
    }

    if (!options.output) {
      console.error(
        "Usage: export --output <file.csv> [--provider <provider>] [--apiKey <key>] [--appId <id>] [--sourceLang <lang>] [--localesDir <dir>]",
      );
      process.exit(1);
    }

    await exportTranslations(options as ExportOptions);
  } else if (command === "import") {
    // 解析导入参数
    const options: Partial<ImportOptions> = {};
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i]?.replace("--", "");
      const value = args[i + 1];
      if (key && value) {
        (options as any)[key] = value;
      }
    }

    if (!options.csv || !options.po) {
      console.error(
        "Usage: import --csv <file.csv> --po <file.po> [--localesDir <dir>]",
      );
      process.exit(1);
    }

    importTranslations(options as ImportOptions);
  } else {
    console.error("Usage:");
    console.error(
      "  export --output <file.csv> [--provider <provider>] [--apiKey <key>] [--appId <id>] [--sourceLang <lang>]",
    );
    console.error("  import --csv <file.csv> --po <file.po>");
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
