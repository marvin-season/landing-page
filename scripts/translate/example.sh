#!/bin/bash
# 翻译工具使用示例脚本

# 示例 1: 导出所有语言的翻译到单个 CSV（使用 DeepL API 自动翻译）
pnpm translate:export \
  --output translations/all-languages.csv \
  --provider deepl \
  --apiKey YOUR_DEEPL_API_KEY

# 示例 2: 导出所有语言的翻译（不使用 API，仅导出现有翻译）
pnpm translate:export \
  --output translations/all-languages.csv

# 示例 3: 从 CSV 导入中文翻译结果
pnpm translate:import \
  --csv translations/all-languages.csv \
  --po zh.po

# 示例 4: 从 CSV 导入日文翻译结果
pnpm translate:import \
  --csv translations/all-languages.csv \
  --po ja.po

