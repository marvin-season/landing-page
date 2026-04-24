# 架构文档、README、Markdown 整理与移除 changelog Rule

## 新增架构说明文档并链到 README
- **文件**: [docs/architecture.md](../../docs/architecture.md)，[README.md](../../README.md)
- **修改内容**: 新增 `docs/architecture.md`，从总览、目录、路由、tRPC/Chat API、Mastra、状态与 i18n、工具链等维度描述当前仓库架构，含 mermaid 数据流示意图；说明 `src/proxy.ts` 与 middleware 的当前关系。在 README 增加 **Architecture** 小节指向该文档。
- **原因/上下文**: 用户要求分析项目架构并添加架构文档，便于协作与后续迭代对齐边界。

## Markdown 整理与 Cursor 规范 (续)

- **文件**: [`.changelog/README.md`](../../.changelog/README.md)，[`AGENTS.md`](../../AGENTS.md)，[`.cursor/README.md`](../../.cursor/README.md)，[`docs/README.md`](../../docs/README.md)，[`README.md`](../../README.md)
- **修改内容**: 重写 `.changelog/README.md` 与 `code-change-history.mdc` 对齐（每日 `index.md`）；新增根 `AGENTS.md`、`.cursor/README.md`、`docs/README.md`（文档地图）；README Architecture 增加指向 `AGENTS.md`。
- **原因/上下文**: 执行「项目 Markdown 整理与 Cursor 规范」计划，统一 changelog 说明并为 Cursor 提供可导航的规范入口。

## 移除 code-change-history Project Rule
- **文件**: 删除 [`.cursor/rules/code-change-history.mdc`](../../.cursor/rules/code-change-history.mdc)；更新 [`.changelog/README.md`](../../.changelog/README.md)，[`AGENTS.md`](../../AGENTS.md)，[`.cursor/README.md`](../../.cursor/README.md)，[`docs/README.md`](../../docs/README.md)
- **修改内容**: 删除 `alwaysApply` 的 changelog 规则；约定与示例并入 `.changelog/README.md`；其余文档改为指向该 README 并说明可由对话要求强制执行。
- **原因/上下文**: 用户认为 Cursor 已提供类似能力，不再用 Project Rule 强制 changelog 流程。
