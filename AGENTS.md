# 本仓库 Agent 导航（Cursor）

面向在本项目中使用 Cursor Agent / Composer 时的快速入口：规则、技能、文档与子系统说明。

## 项目约定（非 Cursor Rule）

- **代码变更与 `.changelog`**：约定见 [`.changelog/README.md`](.changelog/README.md)（按日 `YYYYMMDD/index.md`、何时追加与何时先读近期记录）。不再使用 `alwaysApply` 的 Project Rule；若希望 Agent 严格执行，可在任务说明中明确要求。

## 本仓库 Skills（按需读取 SKILL.md）

| 路径 | 适用场景 |
|------|----------|
| [`.cursor/skills/pretext/SKILL.md`](.cursor/skills/pretext/SKILL.md) | 集成 `@chenglou/pretext`、多行文本测量、预测段落高度、换行、canvas/SVG/WebGL 文本排版或绕几何排版 |
| [`.cursor/skills/vercel-react-best-practices/SKILL.md`](.cursor/skills/vercel-react-best-practices/SKILL.md) | 编写/审查/重构 React 与 Next.js、数据获取、包体与性能优化；细则见同目录 `rules/*.md` |

## 人类文档（docs）

- [docs/README.md](docs/README.md)：项目内 Markdown 文档地图
- [docs/architecture.md](docs/architecture.md)：架构（路由、API、tRPC、Mastra、状态等）
- [docs/tech-stack.md](docs/tech-stack.md)：技术栈清单（版本以 `package.json` 为准）
- [docs/i18n.md](docs/i18n.md)：Lingui / 国际化
- [README.md](README.md)：快速开始与 Stack 列表

## 子系统 README

- [mastra-server/README.md](mastra-server/README.md)：Mastra 实例、agents、tools、workflows、与 Chat API 的关系
- [agent-server/README.md](agent-server/README.md) 及 [agent-server/docs/](agent-server/docs/)：独立 agent 服务与 AgUI 相关说明
- [src/lib/stream/README.md](src/lib/stream/README.md)：流式聊天相关模块说明
- [src/app/admin/README.md](src/app/admin/README.md)：Admin 区域说明

## Cursor 配置目录

- [`.cursor/README.md`](.cursor/README.md)：`rules/` 与 `skills/` 分工说明
