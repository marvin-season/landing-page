# 对话路由收束与多实现切换入口

## 统一对话入口参数与跨实现切换 Tab（17:27:08）
- **文件**: `src/components/chat/chat-mode-tabs.tsx`，`src/app/agent/page.tsx`，`src/app/agent/[sessionId]/page.tsx`，`src/app/agui/(home)/page.tsx`，`src/app/agui/rxjs/page.tsx`，`src/app/agui/rxjs/[resourceId]/page.tsx`
- **修改内容**:
  - 新增 `ChatModeTabs`，在 `agent`、`copilotkit`、`rxjs` 三套实现之间通过 Tab 样式入口快速切换。
  - 在 `agent` 首页与会话页、`agui` 首页、`agui/rxjs` 入口页与会话页接入统一切换入口，保留原有页面功能不变。
- **原因/上下文**: 用户希望保留不同实现方式并可通过 Tab 在各实现间切换测试。

- **文件**: `src/app/api/chat/route.ts`，`src/app/agui/rxjs/constants.ts`，`src/app/agent/_components/chat-main.tsx`
- **修改内容**:
  - `api/chat` 增加 `agentId` 与 `resourceId` 解析/校验逻辑，默认回退到 `generalAgent`，并在 GET/POST 中统一使用。
  - `agent` 与 `rxjs` 发送体补充 `agentId`，使调用参数与核心路由保持一致，收束到 `api/chat` 为主干。
- **原因/上下文**: 以 `src/app/api/chat/route.ts` 为核心，统一 `src/mastra/agents` 主流程参数入口，减少多实现间的调用分叉。

## 抽离 chat 核心请求工具并替换重复调用（17:28:12）
- **文件**: `src/lib/chat/api.ts`，`src/app/agui/rxjs/constants.ts`，`src/store/message-store.ts`，`src/app/agui/rxjs/[resourceId]/page.tsx`
- **修改内容**:
  - 新增 `src/lib/chat/api.ts`：统一封装 `buildSubmitMessageBody`、`buildChatHistoryUrl`、`fetchChatHistory`，默认 `agentId` 指向 `generalAgent`。
  - `rxjs` 的 `buildChatBody` 改为复用 `buildSubmitMessageBody`，避免重复维护请求体结构。
  - `message-store` 与 `rxjs/[resourceId]` 历史拉取改为统一调用 `fetchChatHistory`，收敛 `/api/chat` 查询参数拼装与响应解析逻辑。
- **原因/上下文**: 继续以 `api/chat` 为中心做规约，先消除多处重复实现，为后续将 `agent` 聊天流处理进一步统一到同一套核心接口打基础。

## agent 主线切换到自定义流式解析（17:33:04）
- **文件**: `src/app/agent/_components/chat-main.tsx`，`src/lib/stream/use-chat-stream-state.ts`，`src/lib/chat/streaming-message.ts`
- **修改内容**:
  - `ChatMain` 从 `useChat` 切换为 `useChatStreamState`：发送时复用 `buildSubmitMessageBody`，流式显示由 `ChatStreamState` 驱动。
  - 新增 `streaming-message` 适配层：将 `ChatStreamState` 映射为可复用的 `UIMessage`（含文本与工具调用 part），并补充 pending user message 构建，保持现有 `MessageItem` 渲染链路不变。
  - `useChatStreamState` 新增 `stop()`，支持在输入区中断流式请求。
  - `ChatMain` 现在渲染“历史消息 + 当前轮用户消息 + 当前轮流式助手消息”，流结束后自动 `refetch()` 同步服务端历史。
- **原因/上下文**: 按用户需求保留 `useChat` 思路但优先采用 `rxjs` 风格自定义流解析能力，提升流式状态控制与可扩展性。

## 首页布局升级并保留现有导航（17:33:04）
- **文件**: `src/app/[lang]/(home)/_components/mine.tsx`
- **修改内容**:
  - 主页改为更清晰的信息架构：顶部 Hero 卡片 + Navigation 卡片网格 + Sentences 引语区。
  - 保留原有入口并扩展为结构化导航卡片，新增 `CopilotKit`、`RxJS` 对话入口，保留 `agent`、`resume`、`ppt`、外部设计系统链接。
  - 内外链行为优化：仅外部链接使用新标签页打开。
  - 统一视觉风格（卡片边框、hover、间距与字体层级），保持现有导航语义不变。
- **原因/上下文**: 用户要求在保留当前导航能力前提下，对首页进行自由发挥优化。

## 流式消息适配层类型修正（17:33:57）
- **文件**: `src/lib/chat/streaming-message.ts`
- **修改内容**:
  - 调整流式消息 `parts` 的中间构建类型，避免与 `UIMessage` 强类型在 `streaming` / `input-streaming` 阶段的字面量约束冲突。
  - 保留最终 `UIMessage` 输出结构不变，确保 `assistant-message-parts` 渲染工具调用与流式文本逻辑可继续复用。
- **原因/上下文**: `pnpm exec tsc --noEmit` 发现状态字面量类型不兼容，需修复以保证类型检查通过。

## 修复 agent 流式阶段重复回答（17:38:40）
- **文件**: `src/app/agent/_components/chat-main.tsx`
- **修改内容**:
  - 在拼装 `messages` 时增加去重保护：若 `currentMessages` 已存在与 `streamingAssistant` 相同 `id` 的消息，则不再追加流式临时消息。
  - 解决流结束后历史回写与流式临时消息短暂并存导致的双份回答显示问题。
- **原因/上下文**: 用户反馈 `agent` 页面流式输出期间出现两份回答，历史数据本身正确。

## 调整 ChatModeTabs 位置与层级（17:47:50）
- **文件**: `src/components/chat/chat-mode-tabs.tsx`，`src/app/agent/page.tsx`，`src/app/agent/[sessionId]/page.tsx`，`src/app/agui/(home)/page.tsx`，`src/app/agui/rxjs/page.tsx`，`src/app/agui/rxjs/[resourceId]/page.tsx`
- **修改内容**:
  - `ChatModeTabs` 从“整行分割条”调整为“嵌入式切换卡片”，新增 `Chat Playground` 标签，视觉更轻量，避免抢主页面层级。
  - 在入口页移除 tabs：`/agent` 与 `/agui/rxjs` 不再显示切换条，避免与首页导航和页面主 CTA 重复。
  - 在对话页保留 tabs 并加内边距嵌入：`/agent/[sessionId]`、`/agui`、`/agui/rxjs/[resourceId]`，减少顶栏压迫感并与首页卡片化风格保持一致。
- **原因/上下文**: 用户反馈 tabs 位置不合理；结合已改造首页的导航职责，切换条应聚焦对话页测试场景而非所有入口页。

## 模式切换改为父容器悬浮下拉（17:52:36）
- **文件**: `src/components/chat/chat-mode-switcher.tsx`，`src/app/agent/layout.tsx`，`src/app/agui/(home)/layout.tsx`，`src/app/agui/rxjs/layout.tsx`，`src/app/agent/[sessionId]/page.tsx`，`src/app/agui/(home)/page.tsx`，`src/app/agui/rxjs/[resourceId]/page.tsx`
- **修改内容**:
  - 新增 `ChatModeSwitcher` 悬浮下拉组件（fixed 右上角），使用 `Select` 在 `agent / copilot / rxjs` 三种模式间切换。
  - 切换时根据当前路径自动复用可共享会话 ID（`/agent/:sessionId` 与 `/agui/rxjs/:resourceId` 互转）。
  - 将切换组件上移到三个模块的父布局（layout）中统一渲染，不再在各 page 内部分别放置。
  - 移除各页面中原有的 `ChatModeTabs` 嵌入逻辑，避免重复布局和页面内层级干扰。
- **原因/上下文**: 用户要求切换控件放在三模块父容器，并采用悬浮下拉方式统一切换模式。

## 移除 prose 与 fund 模块及相关依赖配置（17:59:47）
- **文件**: `src/app/prose/layout.tsx`，`src/app/prose/page.tsx`，`src/app/fund/layout.tsx`，`src/app/fund/page.tsx`，`src/app/fund/_components/*`，`src/app/fund/_constants/popular-funds.ts`，`src/components/editor/**`，`src/store/useFundStore.ts`，`src/app/api/proxy/route.ts`，`src/proxy.ts`，`package.json`，`pnpm-lock.yaml`
- **修改内容**:
  - 删除 `prose` 与 `fund` 路由页面及其私有实现代码（基金页面组件、ProseMirror 编辑器全量组件与相关 store）。
  - 删除仅供 `fund` 使用的 `/api/proxy` 接口。
  - 清理 i18n proxy matcher 中对 `fund` 与 `prose` 的特殊排除项。
  - 从依赖中移除已不再使用的 `dayjs` 与 `prosemirror-*` 相关包，并同步更新锁文件。
- **原因/上下文**: 用户要求移除 `src/app/prose/`、`src/app/fund/` 及其相关依赖与配置，避免保留无效路由和冗余依赖。
