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
