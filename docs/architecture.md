# 架构说明

本文描述 `landing-page` 仓库的整体结构、运行时边界与主要数据流，便于新成员与后续迭代时对齐上下文。

## 1. 总览

项目是一个 **Next.js App Router** 全栈应用（默认开发端口 **3001**），主要包含：

- **营销 / 个人站点**：多语言落地页与简历等，路由在 `src/app/[lang]/` 下。
- **Agent 对话**：`/agent` 下的聊天界面，依赖 NextAuth 登录、tRPC 管理线程、Mastra 流式对话。
- **管理 / 演示**：`/admin` 下的 CRUD、PPT 画布等实验性功能。
- **类型安全 API**：`server/` 中的 tRPC 路由，经 `src/app/api/trpc` 暴露。
- **AI 运行时配置**：`mastra-server/` 中的 Mastra 实例、Agent、工具与工作流，被 API Route 与同进程 tRPC 直接引用。

```mermaid
flowchart TB
  subgraph browser [浏览器]
    UI[React 页面与组件]
  end
  subgraph next [Next.js 应用]
    RSC[RSC / Server Components]
    API[Route Handlers /api/*]
    UI --> RSC
    UI --> API
  end
  subgraph server_code [同仓库服务端模块]
    TRPC[server/ tRPC Routers]
    MASTRA[mastra-server/ Mastra]
  end
  API --> TRPC
  API --> MASTRA
  TRPC --> MASTRA
  subgraph external [外部 / 可配置]
    REMOTE[NEXT_PUBLIC_API_BASE_URL]
    AGENT_SVC[localhost:7777 via /api-agent]
  end
  next -.->|rewrites /api-remote| REMOTE
  next -.->|rewrites /api-agent| AGENT_SVC
```

## 2. 目录与职责

| 路径 | 职责 |
|------|------|
| `src/app/` | App Router 页面、`layout.tsx`、`error.tsx`、API Routes |
| `src/components/` | 可复用 UI（含 shadcn、ai-elements、markdown 等） |
| `src/lib/` | 工具函数、i18n 封装、chat/stream、tRPC 客户端封装等 |
| `src/store/` | Zustand 状态（消息、会话、PPT、IndexedDB 持久化等） |
| `src/locales/` | Lingui 编译产物与 `.po` 源（按语言分文件） |
| `server/` | tRPC `appRouter` 及各子路由（user / model / thread） |
| `mastra-server/` | Mastra 单例、agents、tools、workflows、storage |
| `docs/` | 补充文档（i18n、技术栈、本文档等） |

### 路径别名（`tsconfig.json`）

- `@/*` → `src/*`
- `~/*` → 仓库根目录（用于引用 `server/`、`lingui.config` 等）
- `$` / `$/*` → `mastra-server`（Mastra 专用短别名）

## 3. 路由结构

### 3.1 多语言站点 `src/app/[lang]/`

- 动态段 `[lang]` 与 `lingui.config` 中的 `locales` 对齐；`generateStaticParams` 在根 layout 中为每种语言生成静态参数。
- 子路由示例：`(home)/` 首页、`resume/` 简历页等。
- 根 layout 负责：`Lingui` 服务端/客户端、`ThemeProvider`、全局样式与 `SettingsMenu`。

### 3.2 Agent `src/app/agent/`

- 独立 `layout.tsx`：全屏布局、**NextAuth 会话校验**，未登录重定向到 `/auth/signin`。
- 挂载 `TankQueryClientProvider`（tRPC + React Query），侧边栏与 `ChatModeSwitcher`。
- 动态线程页：`agent/[threadId]/page.tsx`。

### 3.3 认证 `src/app/auth/`

- NextAuth v5：`src/auth.ts`（Credentials 演示用登录）、`src/app/api/auth/[...nextauth]/route.ts`。
- JWT session，自定义 `signIn` 页面路径。

### 3.4 管理 `src/app/admin/`

- 聚合入口、`crud`、`ppt`（Fabric 相关）及 catch-all `[...params]`。

### 3.5 国际化与 `src/proxy.ts`

- `src/proxy.ts` 实现了基于 `Accept-Language` 的 locale 检测与重定向逻辑，并带有 `config.matcher` 说明（排除 `api`、`auth`、`agent`、`admin` 等）。
- **当前仓库中未发现根目录 `middleware.ts` 调用该函数**；若需要无 locale 前缀访问时自动跳转到 `/[lang]/...`，需在 Next.js `middleware` 中接入（参见文件内注释链接的 Next.js i18n 文档）。

## 4. 数据层与 API

### 4.1 tRPC

- **入口**：`src/app/api/trpc/[trpc]/route.ts` → `fetchRequestHandler` + `appRouter`。
- **聚合路由**：`server/index.ts` 组合 `user`、`model`、`thread`。
- **上下文**：`server/trpc.ts` 的 `createTRPCContext` 注入 `next-auth` 的 `session`；`protectedProcedure` 要求已登录用户。
- **客户端**：`src/lib/trpc.ts` 使用 `@trpc/tanstack-react-query` 的 `TRPCProvider` / `useTRPC`；在 Agent 布局中挂载。

### 4.2 线程与 Mastra Memory

- `server/thread/index.ts` 通过 `mastra.getAgent(...).getMemory()` 操作线程列表、创建与更新等，与聊天 API 中的 `threadId` / `resourceId`（用户 id）一致。

### 4.3 Chat 流式 API

- `src/app/api/chat/route.ts`：`auth()` 校验 → `handleChatStream`（`@mastra/ai-sdk`）→ `createUIMessageStreamResponse`（`ai` 包）。
- 使用 `mastra-server` 导出的单例与默认 `AGENT_ID`。

### 4.4 其他 API

- 例如 `src/app/api/ppt/route.ts` 等，按功能拆分。

### 4.5 Next.js `rewrites`（`next.config.ts`）

- `/api-remote/:path*` → `NEXT_PUBLIC_API_BASE_URL`，用于前端以同源路径代理后端。
- `/api-agent/:path*` → `http://localhost:7777`，用于独立 Agent 服务（若运行）。

## 5. Mastra 子系统

详见 [mastra-server/README.md](../mastra-server/README.md)。要点：

- `mastra-server/index.ts` 注册 agents（如 general、ppt）、workflow、LibSQL storage、日志与 observability。
- 与 Next 进程**同一 Node 运行时**内 import，无单独 HTTP 端口要求（与可选的 `localhost:7777` 外部服务不同）。

## 6. 前端状态与流式 UI

- **Zustand**：`src/store/`（消息、会话、聊天设置、PPT、IDB 持久化等）。
- **流式聊天**：`src/lib/stream/`、`use-chat-stream-state` 等与 AI SDK / Mastra 流对接。
- **UI 栈**：Tailwind CSS 4、Radix、Framer Motion / Motion、GSAP、统一 Markdown（unified 管线）等。

## 7. 国际化（Lingui）

- 构建链：`@lingui/swc-plugin`、`@lingui/loader`（`.po` → Turbopack）、`postinstall` 执行 `lingui compile`。
- 运行时：`src/lib/i18n/appRouterI18n.ts`（`server-only`）加载各语言 catalog；开发环境用 `.po`，生产构建用编译后的 `.js`。
- 更细的用法见 [i18n.md](./i18n.md)。

## 8. 质量与工具

- **Biome**：lint / format（`biome.json`，pre-commit 经 `simple-git-hooks` 触发 `check:staged`）。
- **React Compiler**：`next.config.ts` 中 `reactCompiler: true`。
- **包管理**：`pnpm`（`packageManager` 字段锁定版本）。

## 9. 相关文档

- [技术栈清单](./tech-stack.md)
- [i18n](./i18n.md)
- [Mastra 目录说明](../mastra-server/README.md)
- 根目录 [README](../README.md)

版本与依赖以仓库内 `package.json` 为准；`docs/tech-stack.md` 中的版本号若与 `package.json` 不一致，以 **`package.json` 为权威**。
