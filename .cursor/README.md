# .cursor 目录说明

本目录存放 **Cursor** 使用的项目级配置与可复用知识，与业务源码分离。

## `rules/`（Project Rules）

- 文件为 **`.mdc`**（Markdown + Cursor 元数据）。
- 典型 frontmatter：`description`（供 Cursor 判断是否相关）、`alwaysApply: true`（每次对话自动注入）。
- **代码变更记录**未放在 Rules 中，约定写在 [`.changelog/README.md`](../.changelog/README.md)；需要时代码助手依赖对话说明或该文档即可。

新增规则时：保持单条规则职责单一；大段流程说明可放在 `docs/` 或 `.changelog/README.md` 以免占用固定上下文。

## `skills/`（Agent Skills）

- 每个子目录一个技能，入口为 **`SKILL.md`**（可含 YAML frontmatter：`name`、`description`）。
- 模型通常按任务匹配 `description` 再读取完整 `SKILL.md`；细则可放在同目录下的 `rules/*.md`、`reference.md` 等。
- 当前技能：
  - [`skills/pretext/`](skills/pretext/)：Pretext 文本测量与排版
  - [`skills/vercel-react-best-practices/`](skills/vercel-react-best-practices/)：Vercel React/Next 性能实践（大量分类规则文件）

不要将整块 Skill 合并进单条 `.mdc`，以免上下文膨胀；优先保持 Skill 目录结构。

## 相关文档

- 根目录 [`AGENTS.md`](../AGENTS.md)：Rules / Skills / docs / 子系统 README 总导航
- [`mcp.json`](mcp.json)：MCP 服务配置（若使用）
