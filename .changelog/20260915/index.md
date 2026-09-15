# 划词翻译支持选择目标语种

## 划词翻译可选择美日韩简体中文 · 15:20
- **文件**: [src/app/[lang]/knowledge/_components/document-preview.tsx](../../src/app/[lang]/knowledge/_components/document-preview.tsx)，[src/app/[lang]/knowledge/_components/translation-language.ts](../../src/app/[lang]/knowledge/_components/translation-language.ts)，[src/locales/zh.po](../../src/locales/zh.po)，[src/locales/ja.po](../../src/locales/ja.po)，[src/locales/en.po](../../src/locales/en.po)
- **修改内容**: 划词工具条增加目标语种选择（English / 日本語 / 한국어 / 简体中文）。点击「翻译」会按所选语种发送指令；选择会写入 localStorage，默认跟随当前界面语言。
- **原因/上下文**: 原先翻译指令跟随 UI 语言，无法指定目标语种。
