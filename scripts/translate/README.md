# 翻译工具使用说明

这个工具可以帮助您批量处理 `.po` 文件的翻译工作，支持使用 API 自动翻译，并通过 CSV 文件进行人工审核和修改。

## 目录结构

```
scripts/translate/
├── cli.ts                    # CLI 入口文件
├── commands/                 # 命令模块
│   ├── export.ts            # 导出命令
│   └── import.ts            # 导入命令
├── lib/                      # 核心库
│   ├── po-parser.ts         # .po 文件解析器
│   ├── csv-handler.ts       # CSV 文件处理器
│   └── translator.ts        # 翻译 API 集成
├── utils.ts                  # 工具函数
├── types.ts                  # 类型定义
├── README.md                 # 使用说明
├── example.sh                # 使用示例
└── translate.config.example.json  # 配置文件示例
```

## 功能特性

- ✅ 从 `.po` 文件提取翻译条目
- ✅ 支持多种翻译 API（Google Translate, DeepL, 百度翻译, OpenAI）
- ✅ 批量翻译并导出到 CSV 文件
- ✅ 运营人员可以在 CSV 中修改翻译结果
- ✅ 从 CSV 导入最终翻译结果并更新 `.po` 文件

## 安装依赖

首先需要安装 `tsx` 来运行 TypeScript 文件：

```bash
pnpm add -D tsx
```

或者使用 npm：
```bash
npm install -D tsx
```

工具使用 Node.js 内置模块，无需额外安装其他依赖。但如果使用百度翻译 API，需要 Node.js 的 `crypto` 模块（已内置）。

## 使用流程

### 1. 导出所有语言的翻译条目到 CSV（可选：自动翻译）

工具会自动读取 `src/locales` 目录下的所有 `.po` 文件，并将它们合并到一个 CSV 文件中。

```bash
# 使用 pnpm 脚本（推荐）
pnpm translate:export \
  --output translations/all-languages.csv \
  --provider deepl \
  --apiKey YOUR_API_KEY

# 或直接使用 tsx
npx tsx scripts/translate-tool.ts export \
  --output translations/all-languages.csv \
  --provider deepl \
  --apiKey YOUR_API_KEY
```

**参数说明：**
- `--output`: 输出的 CSV 文件路径（如果目录不存在会自动创建）
- `--provider`: 翻译服务提供商（可选：`google`, `deepl`, `baidu`, `openai`）
- `--apiKey`: 翻译 API 的密钥（如果使用翻译服务）
- `--appId`: 百度翻译需要的 App ID（仅百度翻译需要）
- `--sourceLang`: 源语言代码（默认 `en`，用于自动翻译）
- `--localesDir`: locales 目录路径（默认 `src/locales`）

**如果不使用自动翻译：**
```bash
pnpm translate:export --output translations/all-languages.csv
```

**CSV 文件格式：**
导出的 CSV 文件包含以下列：
- `#:`: 注释信息（源文件位置等）
- `msgId`: 原始文本 ID
- `en`: 英文翻译
- `zh`: 中文翻译
- `ja`: 日文翻译
- ...（其他语言列）

示例：
```csv
#:,msgId,en,zh,ja
#: src/components/example.tsx:10,Hello World,Hello World,你好世界,こんにちは世界
```

### 2. 运营人员编辑 CSV 文件

运营人员可以：
1. 打开 CSV 文件（建议使用 Excel 或 Google Sheets）
2. 检查各语言列的翻译结果
3. 直接修改对应语言列的翻译内容
4. 保存文件

**注意：** 如果 CSV 文件已存在，工具会保留现有的翻译内容，只更新缺失的翻译。

### 3. 从 CSV 导入翻译结果到指定语言的 .po 文件

```bash
# 导入中文翻译
pnpm translate:import \
  --csv translations/all-languages.csv \
  --po zh.po

# 导入日文翻译
pnpm translate:import \
  --csv translations/all-languages.csv \
  --po ja.po
```

**参数说明：**
- `--csv`: CSV 文件路径
- `--po`: 目标 `.po` 文件名（相对于 `src/locales` 目录，如 `zh.po`, `ja.po`）
- `--localesDir`: locales 目录路径（默认 `src/locales`）

工具会自动从 CSV 文件中读取对应语言列的内容，并更新到 `.po` 文件的 `msgstr` 字段。

## 支持的翻译服务

### DeepL
```bash
--provider deepl --apiKey YOUR_DEEPL_API_KEY
```

### Google Translate
```bash
--provider google --apiKey YOUR_GOOGLE_API_KEY
```

### 百度翻译
```bash
--provider baidu --apiKey YOUR_SECRET_KEY --appId YOUR_APP_ID
```

### OpenAI
```bash
--provider openai --apiKey YOUR_OPENAI_API_KEY
```

## 完整工作流示例

```bash
# 1. 导出所有语言的翻译到单个 CSV 文件（自动翻译缺失的翻译）
pnpm translate:export \
  --output translations/all-languages.csv \
  --provider deepl \
  --apiKey YOUR_DEEPL_KEY

# 2. 运营人员编辑 translations/all-languages.csv 文件
#    在 Excel 或 Google Sheets 中打开，修改各语言列的翻译内容

# 3. 导入中文翻译结果
pnpm translate:import \
  --csv translations/all-languages.csv \
  --po zh.po

# 4. 导入日文翻译结果
pnpm translate:import \
  --csv translations/all-languages.csv \
  --po ja.po

# 5. 如果后续有新的翻译条目，再次运行导出命令
#    工具会自动保留现有 CSV 中的翻译，只添加新的条目
pnpm translate:export \
  --output translations/all-languages.csv \
  --provider deepl \
  --apiKey YOUR_DEEPL_KEY
```

## 注意事项

1. **API 速率限制**：工具会自动在批量翻译之间添加延迟，但如果翻译条目很多，可能需要较长时间。

2. **CSV 文件格式**：请确保 CSV 文件使用 UTF-8 编码，特别是在包含中文、日文等字符时。

3. **备份文件**：在导入翻译结果前，建议备份原始的 `.po` 文件。

4. **空翻译处理**：如果 CSV 中的 `finalText` 为空，工具会保留原有的 `msgstr` 值。

5. **注释保留**：工具会保留 `.po` 文件中的所有注释信息。

## 故障排除

### 翻译 API 错误
- 检查 API 密钥是否正确
- 确认 API 服务是否可用
- 查看是否有速率限制或配额限制

### CSV 导入失败
- 确保 CSV 文件包含 `msgId` 列和目标语言列（如 `zh`, `ja`）
- 检查 CSV 文件编码是否为 UTF-8
- 确认 CSV 文件格式正确（特别是包含引号或逗号的字段）
- 确认目标语言列存在于 CSV 文件中

### .po 文件格式错误
- 工具会尽量保持原始格式，但建议在导入前备份文件
- 如果出现问题，可以使用版本控制恢复

