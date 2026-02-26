# vinext 迁移与构建兼容修复

## 迁移项目到 vinext 并完成构建验证 (16:24:42)
- **文件**: `package.json`、`pnpm-lock.yaml`、`vite.config.ts`、`next.config.mjs`、`src/app/[lang]/layout.tsx`（删除 `next.config.ts`）
- **修改内容**:
  - 执行 `vinext check` 与 `vinext init`，引入 `vinext`、`vite`，并将项目切换为 ESM（`"type": "module"`）。
  - 将默认脚本切换到 vinext：`dev/build/start` 改为 `vinext`，同时保留 `dev:next/build:next/start:next` 回退脚本。
  - 新增 `next.config.mjs`（ESM）替代 `next.config.ts`，以兼容 vinext 对 Next 配置文件的加载方式。
  - 为 Lingui 与 App Router 补齐 Vite 侧能力：新增 `@vitejs/plugin-rsc`、`@lingui/vite-plugin`、`@vitejs/plugin-react`、`@lingui/babel-plugin-lingui-macro`，并在 `vite.config.ts` 配置对应插件。
  - 修复 `next/font/google` 在 vinext shim 下的命名导出兼容问题：`Lora` 改为通过默认导出对象访问。
  - 运行并通过 `pnpm run build`（vinext）验证，`pnpm run dev:vinext` 可成功启动到 `http://localhost:3001/`。
- **原因/上下文**: 用户要求将当前 Next.js 项目迁移到 vinext，并保证迁移后可运行。

## 修复 /agent 页 vinext RSC 客户端引用错误 (16:29:23)
- **文件**: `src/app/agent/page.tsx`、`src/app/agent/_components/sidebar/chat-sidebar.tsx`
- **修改内容**:
  - 移除 `page.tsx` 中对 `next/dynamic` 的 `ChatSidebar` 动态导入，改为静态导入，避免 vinext RSC 在服务端路径执行到客户端引用代理。
  - 为 `chat-sidebar.tsx` 增加 `"use client"`，将该侧边栏及其 tooltip/session 交互明确归入客户端边界，避免「client reference export 'default' is called on server」错误。
  - 重新验证：vinext dev 日志不再出现该错误；`pnpm run build` 通过。
- **原因/上下文**: 用户提供运行日志，`/agent` 路由在 vinext dev 下报客户端引用在服务端被调用的内部错误。

## 修复首页 motion 初始透明导致 UI 不可见 (16:35:17)
- **文件**: `src/app/[lang]/(home)/_components/mine.tsx`
- **修改内容**:
  - 将首页文本区动画的 `initial` 从 `{ opacity: 0 }` 改为 `false`，避免在 vinext + motion 运行时兼容问题下停留在透明态。
  - 保留 `animate` 与 `transition` 声明，确保在支持场景下行为一致，在不支持场景下至少可见可交互。
- **原因/上下文**: 用户反馈首页元素可检查但 UI 不可见、点击无响应，并定位到 DOM 上存在 `opacity: 0`。

## 修复 /agent 点击创建会话报 module is not defined (16:39:41)
- **文件**: `package.json`、`pnpm-lock.yaml`
- **修改内容**:
  - 将 `react`、`react-dom` 从 `19.2.3` 升级并对齐到 `19.2.4`。
  - 新增项目直接依赖 `react-server-dom-webpack@19.2.4`，避免 vinext dev 运行时落到未转换的 CJS `client.browser.js` 入口导致浏览器端 `module is not defined`。
  - 重新执行 `pnpm run build` 验证通过。
- **原因/上下文**: 用户在 `/agent` 页面点击创建会话时报错 `client.browser.js: ReferenceError: module is not defined`。

## 修复 /api/chat 在 vinext 下读取 searchParams 报错 (16:43:37)
- **文件**: `src/app/api/chat/route.ts`
- **修改内容**:
  - `GET` 处理函数参数从 `NextRequest` 调整为标准 `Request`。
  - 将 `req.nextUrl.searchParams` 改为 `new URL(req.url).searchParams` 读取 `resourceId`，避免 vinext 路由处理上下文中 `nextUrl` 为空导致崩溃。
- **原因/上下文**: 访问 `/agui/rxjs/[resourceId]` 时，后端报错 `TypeError: Cannot read properties of undefined (reading 'searchParams')`。

## 修复 /agent 会话页 Maximum update depth 循环更新 (16:45:35)
- **文件**: `src/app/agent/_components/chat-main.tsx`
- **修改内容**:
  - 将 `useChat` 的 `transport` 改为 `useMemo` 构造，避免每次渲染创建新的 `DefaultChatTransport` 引发内部状态反复重建。
  - 在同步历史消息到 `useChat` 时增加差异判断（按消息数量与 id 比较），仅在确有变化时调用 `setMessages`，避免重复写入触发循环更新。
- **原因/上下文**: 访问 `/agent/[sessionId]` 报错 `Maximum update depth exceeded`，堆栈指向 ai-sdk chat 状态更新链路。

## 修复 /agent 会话页空消息读取 role 报错 (16:46:41)
- **文件**: `src/app/agent/_components/chat-main.tsx`
- **修改内容**:
  - 在渲染 `ChatLoading` 前增加 `displayMessages.length > 0` 判断，避免 `displayMessages[displayMessages.length - 1]` 在空数组时为 `undefined` 而读取 `role` 报错。
- **原因/上下文**: 用户反馈 `TypeError: Cannot read properties of undefined (reading 'role')`，定位到 `chat-main.tsx` 中末条消息角色判断逻辑。

## 修复 /agent 流式期间消息被历史同步覆盖 (16:49:45)
- **文件**: `src/app/agent/_components/chat-main.tsx`
- **修改内容**:
  - 调整“历史消息同步到 useChat”的 `useEffect`：当 `status` 为 `submitted/streaming` 时直接跳过同步。
  - 仅在非流式阶段才执行 `setMessages(currentMessages)`，防止把前端实时消息（用户刚发出的消息与 AI 流式输出）覆盖回旧历史。
- **原因/上下文**: 用户反馈发送后页面看不到当前轮消息与流式输出，但刷新后历史回显正常，属于同步时机错误导致的状态回滚。

## 修复新建会话复用旧 New Conversation 问题 (16:52:15)
- **文件**: `src/store/session-store.ts`
- **修改内容**:
  - 删除 `createNewSession` 中按标题 `New Conversation` 复用历史会话的逻辑。
  - 调整后每次点击新建都会生成并写入新的 `sessionId`，不会再选中旧会话。
- **原因/上下文**: 用户反馈点击侧边栏新建会话时没有创建新会话，而是跳到第一个 `New Conversation`。

## 清理迁移后无关 Next.js 配置 (16:57:29)
- **文件**: `package.json`、`next.config.mjs`
- **修改内容**:
  - 删除仅用于旧 Next 运行方式的脚本：`analyze`、`dev:next`、`build:next`、`start:next`。
  - 删除 `next.config.mjs` 中仅 Turbopack 使用的 `turbopack.rules`（Lingui `*.po` loader），保留 vinext 仍会读取的 `rewrites` 与 `experimental.swcPlugins`。
  - 运行 `pnpm run build`（vinext）验证通过。
- **原因/上下文**: 用户要求在迁移到 vinext 后删除旧的、无关的 Next.js 配置，降低配置噪音与维护成本。
