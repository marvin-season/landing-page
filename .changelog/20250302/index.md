# mastra-server README 与 Auth.js 集成（agent 用 userId 替代 RESOURCE_ID）

## 新增 mastra-server/README.md 说明文档
- **文件**: [mastra-server/README.md](../../mastra-server/README.md)
- **修改内容**: 新建 mastra-server 目录说明，包含目录结构（index、constant、storage、agents、tools、workflows、lib）、在项目中的使用方式（Chat API、Thread、Agno/CopilotKit）、以及 `$` 别名说明。
- **原因/上下文**: 用户要求添加 mastra-server 与 README 相关内容；主 README 已存在对 mastra-server/README.md 的引用。

## 集成 Auth.js，agent 使用 userId 作为 resourceId
- **文件**: `package.json`（新增 next-auth@beta）、`src/auth.ts`、`src/types/next-auth.d.ts`、`src/app/api/auth/[...nextauth]/route.ts`、`src/app/auth/layout.tsx`、`src/app/auth/signin/page.tsx`、`server/trpc.ts`、`server/thread/index.ts`、`src/app/api/chat/route.ts`、`src/app/agent/layout.tsx`
- **修改内容**:
  - 安装 next-auth@beta，新增 Auth.js 配置（Credentials 登录、session 中写入 user.id）、Session 类型扩展、`/api/auth/[...nextauth]` 与登录页 `/auth/signin`。
  - tRPC 的 createTRPCContext 中调用 auth() 注入 session；新增 protectedProcedure（未登录抛 UNAUTHORIZED），thread 相关 procedure 改为 protectedProcedure，resourceId 使用 ctx.userId（即 session.user.id）。
  - Chat API POST：从 session 取 resourceId（session.user.id），未登录返回 401。
  - Agent 区域：layout 内服务端 auth() 鉴权，未登录重定向到 `/auth/signin?callbackUrl=/agent`；auth 布局用 SessionProvider 包裹，登录页使用 credentials 输入 userId 登录。
- **原因/上下文**: 用户要求集成 Auth.js，并用当前用户的 userId 替代 RESOURCE_ID；仅针对 `src/app/agent` 与相关 API（chat、thread），未改动 agui 与 copilotkit。

## 修复 /auth/signin 的 useSearchParams Suspense 报错
- **文件**: [src/app/auth/signin/page.tsx](../../src/app/auth/signin/page.tsx)
- **修改内容**: 将使用 `useSearchParams()` 的 UI 抽成 `SignInContent`，新增 `SignInFallback` 作为加载态；默认导出 `SignInPage` 用 `<Suspense fallback={<SignInFallback />}>` 包裹 `<SignInContent />`。
- **原因/上下文**: Next.js 静态生成时要求 `useSearchParams()` 必须在 Suspense 边界内，否则会报错并导致 build 失败。
