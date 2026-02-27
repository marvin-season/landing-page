# agent / rxjs 消息 UI 一致性与组件复用

## 抽取统一消息外壳并对齐 rxjs 当前轮渲染（09:32:37）
- **文件**: `src/components/chat/chat-message-shell.tsx`，`src/app/agent/_components/message/message-item.tsx`，`src/app/agui/rxjs/components/ResponseSection.tsx`，`src/app/agui/rxjs/[resourceId]/page.tsx`
- **修改内容**:
  - 新增 `ChatMessageShell`，统一封装 user/assistant 的头像、左右对齐与消息气泡样式。
  - `MessageItem` 改为复用 `ChatMessageShell`，保留 `UserMessageParts` / `AssistantMessageParts` 渲染逻辑不变。
  - `ResponseSection` 新增 `layout` 参数（`section | message`），在 `message` 模式下复用 `ChatMessageShell` 渲染当前轮助手输出。
  - `rxjs/[resourceId]/page.tsx` 的当前轮用户问题改为复用 `ChatMessageShell` + `Markdown`，并让 `ResponseSection` 使用 `layout="message"`，从而与历史消息视觉更一致。
- **原因/上下文**: 用户希望 `message-item` 在 agent 与 rxjs 页面表现尽量统一，并尽可能抽取组件复用，尤其是 rxjs 页当前轮与历史记录之间的样式一致性。

## 对齐 agent 内部工具调用样式到 ResponseSection（09:36:47）
- **文件**: `src/app/agent/_components/message/assistant-message-parts.tsx`
- **修改内容**:
  - 将消息内部块间距由 `space-y-3` 调整为 `space-y-4`，与 `ResponseSection` 的内容堆叠间距保持一致。
  - 工具调用外层容器从 `w-fit` 调整为 `w-full max-w-full`，避免工具卡片收缩，改为与 `ResponseSection` 一致的满宽展示。
  - 工具输入在缺省时从 `{}` 改为 `"…"` 占位，和 `ResponseSection` 的流式输入展示保持一致。
- **原因/上下文**: 用户要求优化 `message-item` 内部工具调用的 UI 表现，并参考 rxjs `ResponseSection` 风格统一展示。
