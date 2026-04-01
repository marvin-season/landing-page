# Git 提交前 Biome 校验接入（当日变更摘要）

## 接入提交前格式化与 lint 校验 (10:00:45)
- **文件**: `package.json`，`pnpm-lock.yaml`
- **修改内容**: 新增 `simple-git-hooks` 依赖；调整 `biome` 相关脚本为 `format`、`lint`、`check`、`check:staged`；配置 `pre-commit` 在提交前执行 `pnpm check:staged`，对已暂存文件执行 `biome check --write --staged --no-errors-on-unmatched`。
- **原因/上下文**: 用户希望在 Git 提交前自动执行 Biome 的格式化与 lint 校验，减少不符合规范的代码进入提交。
