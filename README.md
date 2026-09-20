# Landing Page

Next.js 全栈落地页与 Agent 演示项目。版本以根目录 `package.json` 为准。

## Stack

- [Next.js](https://nextjs.org/) 16 — App Router、RSC、Route Handlers
- [React](https://react.dev/) 19 — UI
- [TypeScript](https://www.typescriptlang.org/) 7 — 类型
- [Tailwind CSS](https://tailwindcss.com/) 4 — 样式
- [shadcn/ui](https://ui.shadcn.com/) 3 — 原子组件在 `packages/design-system`
- [Biome](https://biomejs.dev/) — lint / format（替代 ESLint 与 Prettier）
- [Lingui](https://lingui.dev/) — i18n，见 [docs/i18n.md](./docs/i18n.md)
- [tRPC](https://trpc.io/) + [TanStack Query](https://tanstack.com/query/latest) — 类型安全 API
- [Mastra](https://mastra.ai/) — Agent 运行时，见 [mastra-server/README.md](./mastra-server/README.md)
- [Agno](https://agno.ai/) — 独立 Python Agent 服务，见 [agent-server/README.md](./agent-server/README.md)
- [RxJS](https://rxjs.dev/) / [Zustand](https://zustand-demo.pmnd.rs/) — 响应式与客户端状态
- [`@antfu/ni`](https://github.com/antfu/ni) + `corepack enable` — 包管理入口（本仓库为 pnpm）

## Architecture

- [架构说明](./docs/architecture.md)
- [文档索引](./docs/README.md)
- [Cursor Agent 导航](./AGENTS.md)

工作区包：

- `packages/design-system` — 共享 UI 原语（`@landing-page/design-system`）
- `packages/utils` — 共享工具（`@landing-page/utils`）

## Editor

打开仓库后按提示安装 [`.vscode/extensions.json`](./.vscode/extensions.json) 中的推荐扩展。

- 必装：[Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
- 一并推荐：Tailwind CSS IntelliSense、i18n Ally、Python、Code Spell Checker
- 不要安装 ESLint / Prettier；工作区已关闭二者，保存时只走 Biome

## Quality

Biome 是唯一的 lint / format 工具，配置在 `biome.json`。

```bash
nr check          # 全量检查
nr lint           # 检查并写入修复
nr format         # 只格式化
nr check:staged   # 只处理 git staged 文件
```

`simple-git-hooks` 会在 `pre-commit` 自动跑 `nr check:staged`：格式化并校验暂存文件，修不掉的错误会拦截提交。临时跳过：

```bash
SKIP_SIMPLE_GIT_HOOKS=1 git commit
```

## Quick Start

```bash
cp .env.example .env.local
nvm use v22.16.0 && corepack enable && npm install -g @antfu/ni@25.0.0
ni
nr dev
```

开发服务默认在 [http://localhost:3001](http://localhost:3001)。

也可以直接用 pnpm：

```bash
pnpm install
pnpm dev
```

常用命令：`nr build`、`nr start`、`nr lingui:extract`、`nr lingui:compile`。日常安装与脚本请用 `ni` / `nr`，不要直接改 `pnpm-lock.yaml`。
