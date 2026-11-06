# 流式对话状态

本目录将不同接口的流式响应转换成统一事件，再归约为 React 使用的 `ChatStreamState`。Hook 管理订阅和生命周期，适配器管理请求与协议转换。

## 目录结构

- `use-chat-stream-state.ts`：React Hook，提供 `state / send / loading / error / stop`。
- `chat-stream-adapter.ts`：适配器契约、默认适配器、取消信号与 `createObservableState`。
- `chat-stream-state.ts`：状态类型、纯事件归约函数、文本合并与完成收尾。
- `chat-request.ts`：当前项目的请求入参、`ChatSubmitMessage` 与 `buildSubmitMessageBody`。
- `chat-stream.ts`：默认接口的 SSE 读取，将 JSON 事件输出为 Observable。
- `chat-stream-adapter.test.ts`：协议兼容、适配器、错误和取消行为测试。

## 默认用法

现有调用方不需要指定适配器：

```tsx
const { state, send, loading, error, stop } = useChatStreamState({
  onComplete: (state) => console.log(chatStreamText(state)),
  onError: (message) => console.error(message),
});

send({
  url: "/api/chat",
  threadId: "thread-1",
  text: "你好",
});
```

省略整个 options 也可以。默认 `send` 入参为 `chat-request.ts` 中的 `TInputParams`：

```ts
type TInputParams = {
  url: string;
  text: string;
  threadId: string;
  messages?: ChatSubmitMessage[];
};
```

默认适配器构造 `{ threadId, messages, trigger: "submit-message" }` 请求体，使用 POST 发送 JSON，并读取 AI SDK `UIMessageChunk` 格式的 SSE 响应。

## 自定义适配器

```ts
import type { UIMessageChunk } from "ai";
import type { ObservableInput } from "rxjs";

type ChatStreamAdapter<TInput> = (
  input: TInput,
  context: { signal: AbortSignal },
) => ObservableInput<UIMessageChunk>;
```

适配器可以返回 Observable、AsyncIterable 或其他 RxJS 支持的事件序列。`async function*` 可以直接作为适配器，不必自行管理 React 状态。

适配器负责：

1. 定义自己的入参，组装 URL、请求头和请求体，或调用供应商 SDK。
2. 将供应商响应转换为统一事件。SSE 只是传输格式，不同供应商的 JSON 事件仍需转换。
3. 将 `signal` 传给请求或 SDK，并在清理阶段释放读取器等资源。取消订阅本身无法中断不响应 signal 的外部操作。
4. 通过抛错、Observable error 或 `{ type: "error", errorText }` 报告失败。

下面以返回**原始 UTF-8 文本流**的接口为例；如果接口返回 SSE，需要在适配器中解析 SSE 后再转换事件：

```ts
import type { ChatStreamAdapter } from "@/lib/stream/chat-stream-adapter";

type TextInput = { url: string; prompt: string; model: string };

export const textAdapter: ChatStreamAdapter<TextInput> = async function* (
  { url, prompt, model },
  { signal },
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model, stream: true }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const id = crypto.randomUUID();
  try {
    yield { type: "text-start", id };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield { type: "text-delta", id, delta: value };
    }
    yield { type: "text-end", id };
  } finally {
    reader.releaseLock();
  }
};
```

接入后 `send` 会自动推导为 `TextInput`，不再要求 `threadId` 或默认请求结构：

```tsx
const { send, state, stop } = useChatStreamState({
  adapter: textAdapter,
  onComplete: (state) => console.log(chatStreamText(state)),
});

send({ url: "/api/custom-text", prompt: "你好", model: "example-model" });
```

第三方鉴权、跨域和具体供应商协议由接入方处理；本模块目前内置的是项目默认适配器。

## 统一状态与事件

```ts
type ChatStreamState = {
  messageId: string | null;
  blocks: ContentBlock[];
  streamingText: string;
  currentTextId: string | null;
  streamingTool: StreamingToolCall | null;
};
```

- `start`：设置 `messageId`。
- `text-start / text-delta / text-end`：开始、追加和完成文本块；同一文本块使用一致的 `id`。
- `tool-input-start / tool-input-delta / tool-input-available / tool-output-available`：更新工具输入和结果。
- `error`：终止状态流，交给 Hook 更新 `error` 并调用 `onError`。
- 其他事件当前不改变状态；新增 reasoning、文件等展示能力还需要扩展状态归约与 UI。

`blocks` 包含已完成的文本块与工具调用；`streamingTool` 当前只记录一个进行中的工具调用，适配器应按顺序输出工具事件。

`chatStreamText(state)` 合并已完成文本与实时文本。流正常完成时，Hook 使用 `flushChatStreamState` 将剩余文本写入 `blocks`，然后调用 `onComplete`。

## 生命周期

- 每个 Hook 实例只管理一条活动订阅。再次 `send` 会取消上一条，并重置状态、错误和 loading。
- `stop()` 取消订阅并触发适配器的 AbortSignal，保留当前状态，设置 `loading = false`，不调用完成或错误回调。
- 卸载通过 `useEffect(() => stop, [stop])` 自动清理，调用方无需重复注册。
- 同步抛错、异步错误和标准错误事件都进入同一错误通道。
- 同步完成的适配器，以及完成回调中再次 `send`，不会覆盖新请求的订阅引用。
- 适配器在每次 send 时选定；仅更换 options.adapter 不会重启正在进行的请求。

## 验证

运行 `nr test:chat-stream` 验证默认协议、自定义输入、异步流、同步完成、错误和取消。运行 `nr check` 检查代码规范。
