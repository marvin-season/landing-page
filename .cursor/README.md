# .cursor 目录说明

本目录存放 **Cursor** 使用的项目级配置与可复用知识，与业务源码分离。

## `rules/`（Project Rules）

- 文件为 **`.mdc`**（Markdown + Cursor 元数据）。
- 典型 frontmatter：`description`、`alwaysApply`、`globs`。
- `alwaysApply: true` 会把全文注入每一轮，只留给每轮都要遵守的短约束。
- 只在特定文件生效时设 `alwaysApply: false` 并写 `globs`。只在相关任务生效时设 `alwaysApply: false`，靠 `description` 让模型按需读取。
- **代码变更记录**未放在 Rules 中，约定写在 [`.changelog/README.md`](../.changelog/README.md)；需要时代码助手依赖对话说明或该文档即可。

新增规则时：保持单条规则职责单一；大段流程说明可放在 `docs/` 或 `.changelog/README.md` 以免占用固定上下文。

## `skills/`（Agent Skills）

- 每个子目录一个技能，入口为 **`SKILL.md`**（可含 YAML frontmatter：`name`、`description`）。
- 模型通常按任务匹配 `description` 再读取完整 `SKILL.md`；细则可放在同目录下的 `rules/*.md`、`reference.md` 等。
- 技能目录里不要放 `AGENTS.md`。Cursor 会把工作区内每份 `AGENTS.md` 每轮注入。全文放在 `reference.md`，需要时再读。
- 当前技能：
  - [`skills/pretext/`](skills/pretext/)：Pretext 文本测量与排版
  - [`skills/vercel-react-best-practices/`](skills/vercel-react-best-practices/)：Vercel React/Next 性能实践（大量分类规则文件）

不要将整块 Skill 合并进单条 `.mdc`，以免上下文膨胀；优先保持 Skill 目录结构。

## 相关文档

- 根目录 [`AGENTS.md`](../AGENTS.md)：Rules / Skills / docs / 子系统 README 总导航
- [`mcp.json`](mcp.json)：MCP 服务配置（若使用）
