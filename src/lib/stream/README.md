# 应用层流式聊天适配器

通用 Hook、状态与 SSE 工具位于 `packages/utils/src/stream`，通过 `@landing-page/utils/stream` 使用。完整契约和生命周期见 [通用流式工具](../../../packages/utils/src/stream/README.md)。

本目录只保留项目相关的适配器、请求构造和集成测试：

- `chat-request.ts`：项目请求入参 `TInputParams`、`ChatSubmitMessage` 与 `buildSubmitMessageBody`。
- `chat-stream-adapter.ts`：`submitMessageStreamAdapter`，构造 submit-message 请求并读取 AI SDK UI 消息流。
- `mock-chat-stream-adapter.ts`：`mockChatStreamAdapter`，把 `/api/knowledge/chatv2` 的 `{ delta }` SSE 转为统一文本事件。
- `*.test.ts`：包能力、项目协议、mock 接口和取消行为的集成测试。

## 使用方式

适配器必须显式传入；Hook 没有默认适配器。

```tsx
import { chatStreamText, useChatStreamState } from "@landing-page/utils/stream";
import { submitMessageStreamAdapter } from "@/lib/stream/chat-stream-adapter";

const { state, send, loading, error, stop } = useChatStreamState({
  adapter: submitMessageStreamAdapter,
  onComplete: (state) => console.log(chatStreamText(state)),
  onError: (message) => console.error(message),
});

send({ url: "/api/chat", threadId: "thread-1", text: "你好" });
```

Agent 会话页显式使用 `submitMessageStreamAdapter`。知识库聊天通过业务适配器分发：开启 AI 回复时调用 `/api/knowledge/chat`，关闭时调用 mock；重试沿用上一次请求的模式。

## Mock SSE 接口

`POST /api/knowledge/chatv2` 接收 `{ text: string }`，分段返回 `hello,i am your assiastant,` 拼接输入文本。每段是 `data: {"delta":"..."}` 加两个换行，最后发送 `data: [DONE]` 并关闭流。

`mockChatStreamAdapter` 补齐 `text-start / text-delta / text-end` 事件，输入类型为 `MockChatInput`（`{ url: string; text: string }`）。URL 由调用方传入，请求体只发送 `{ text }`；知识库聊天传入 `/api/knowledge/chatv2`。

## 验证

在仓库根目录运行 `nr test:chat-stream` 和 `nr check`。
