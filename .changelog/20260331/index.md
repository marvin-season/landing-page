# Pretext 示例页与 Skill 整理（当日变更摘要）

## 新增 Pretext 功能示例页 (10:18:20)
- **文件**: `src/app/[lang]/pretext/page.tsx`，`src/app/[lang]/pretext/pretext-demo.tsx`，`package.json`，`pnpm-lock.yaml`
- **修改内容**: 新增 `src/app/[lang]/pretext` 路由页面，并实现一个客户端交互 demo；支持切换示例文本、调整宽度/字号/行高/字重、切换 `whiteSpace`，同时展示 `profilePrepare`、`layout`、`layoutWithLines`、`walkLineRanges` 的结果，以及与 DOM 实际高度的对照和 canvas 手工排版预览；同时安装 `@chenglou/pretext` 依赖并更新锁文件。
- **原因/上下文**: 用户希望学习并接入 `https://github.com/chenglou/pretext`，在 `@src/app/[lang]/` 下创建一个能直观展示其文本测量与排版能力的示例。

## 新增 Pretext 项目级 Skill (10:18:20)
- **文件**: `.cursor/skills/pretext/SKILL.md`，`.cursor/skills/pretext/reference.md`
- **修改内容**: 新增项目级 `pretext` skill，整理 `@chenglou/pretext` 的适用场景、API 选型、React/Next.js 使用准则、性能与精度注意事项，并补充可复制的调用模板与常见误区。
- **原因/上下文**: 用户希望将 Pretext 的使用手册整理为可供 Cursor、Codex 等 AI 编程工具复用的技能文档。
