# 应用层流式聊天适配器

通用 Hook、状态与 SSE 工具位于 `packages/utils/src/stream`，通过 `@landing-page/utils/stream` 使用。完整契约和生命周期见 [通用流式工具](../../../packages/utils/src/stream/README.md)。

本目录只保留项目相关的适配器、请求构造和集成测试：

- `chat-request.ts`：`ChatSubmitMessage` 与 `buildSubmitMessageBody`，构造项目 submit-message 请求体。
- `mock-chat-stream-adapter.ts`：`mockChatStreamAdapter`，把 `/api/knowledge/chatv2` 的 `{ delta }` SSE 转为统一文本事件。
- `*.test.ts`：包能力、项目协议、mock 接口和取消行为的集成测试。

## 使用方式

项目接口已经返回 AI SDK `UIMessageChunk` SSE，直接使用默认行为，无需传 adapter。

```tsx
import { getChatStreamText, useChatStreamState } from "@landing-page/utils/stream";
import { buildSubmitMessageBody } from "@/lib/stream/chat-request";

const { state, send, loading, error, stop } = useChatStreamState({
  onComplete: (state) => console.log(getChatStreamText(state)),
  onError: (message) => console.error(message),
});

send({
  url: "/api/chat",
  body: buildSubmitMessageBody({ threadId: "thread-1", text: "你好" }),
});
```

Agent 会话页省略 adapter，使用包内默认的 `aiSdkChatStreamAdapter`。知识库聊天需要同时演示两种模式，因此保留分发函数：开启 AI 回复时将 `{ url, body }` 交给默认适配器，关闭时交给 `mockChatStreamAdapter`；只有 mock 分支需要转换事件格式。重试沿用上一次请求的模式与请求内容。

## Mock SSE 接口

`POST /api/knowledge/chatv2` 接收 `{ text: string }`，分段返回 `hello,i am your assiastant,` 拼接输入文本。每段是 `data: {"delta":"..."}` 加两个换行，最后发送 `data: [DONE]` 并关闭流。

`mockChatStreamAdapter` 补齐 `text-start / text-delta / text-end` 事件，输入类型为 `MockChatInput`（`{ url: string; text: string }`）。URL 由调用方传入，请求体只发送 `{ text }`；知识库聊天传入 `/api/knowledge/chatv2`。

它用于验证第三方格式的接入：响应 `{ delta }` 转为 `UIMessageChunk` 后，复用与默认 AI SDK 接口相同的状态归约和 UI。

```tsx
const { send } = useChatStreamState({ adapter: mockChatStreamAdapter });
send({ url: "/api/knowledge/chatv2", text: "你好" });
```

## 验证

在仓库根目录运行 `nr test:chat-stream` 和 `nr check`。
