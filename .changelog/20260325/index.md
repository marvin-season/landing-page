# Next.js 升级与保存自动格式化修复（当日变更摘要）

## 升级 Next.js 到最新稳定版本并验证构建 (10:54:28)
- **文件**: `package.json`，`pnpm-lock.yaml`
- **修改内容**: 将 `next` 从 `16.1.1` 升级到 `16.2.1`，同步更新锁文件并重新安装依赖。
- **原因/上下文**: 用户要求升级当前项目 Next 版本，并确保升级后项目可正常构建。

## 修复项目保存自动格式化失效 (16:42:28)
- **文件**: `.vscode/settings.json`
- **修改内容**: 增加 `editor.formatOnSaveMode`，将保存时代码动作改为 Biome 专用（`quickfix.biome`、`source.organizeImports.biome`），并补充 TypeScript/JavaScript/JSON 系列语言的 `editor.defaultFormatter` 为 `biomejs.biome`。
- **原因/上下文**: 用户反馈当前项目保存自动格式化失效，需要修复工作区内保存触发 Biome 格式化的稳定性。
