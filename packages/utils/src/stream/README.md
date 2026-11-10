# 流式对话工具

通过 `@landing-page/utils/stream` 导入。此入口包含 React Hook、状态归约、订阅生命周期和 SSE 读取工具；不包含任何具体接口地址、请求体或项目适配器。

`@landing-page/utils` 的普通工具入口保持独立，不导出流式模块。

## 目录结构

- `sse-json-stream.ts`：**传输层**。`createJsonSseStream` 发送 POST JSON 请求，逐行解析 SSE 的 JSON data；不依赖聊天事件类型。
- `chat-event-stream.ts`：**事件层**。定义 `ChatStreamAdapter` 和默认的 `aiSdkChatStreamAdapter`；`createChatEventStream` 调用适配器并管理取消，原样输出事件。
- `chat-stream-state.ts`：**状态层**。定义聊天状态，提供纯状态函数与 `createChatStateStream`，将 AI SDK 事件累积为文本和工具调用。
- `use-chat-stream-core.ts`：事件层的 React 生命周期封装，管理 send / stop / 卸载，通过回调逐条输出事件。
- `use-chat-stream-state.ts`：组合 core 与状态函数，提供 `state / send / loading / error / stop`。
- `index.ts`：独立子路径的公开导出。

### 为什么分三层

三层分别回答“如何读取响应”“如何订阅与取消事件”“如何把事件变成聊天内容”。Observable 是共同的返回形式，不能用来区分职责。

SSE 工具由内置 AI SDK 适配器和应用自定义适配器按需使用；适配器也可以使用 SDK、异步迭代器或其他传输方式。事件层不依赖状态层，自定义事件无需加载聊天归约逻辑。状态层依赖事件层，专门处理 AI SDK 聊天事件。React Hook 再组合这些能力。

### 按用途选方法

- 请求 SSE 接口：`createJsonSseStream<TEvent>(url, body, signal)` → `Observable<TEvent>`。只创建流，订阅时才发请求；事件类型由调用方指定，默认 `unknown`。
- 订阅适配器事件：`createChatEventStream(input, adapter)` → `Observable<TEvent>`。每次订阅创建独立的取消信号，结束或退订时释放。
- 订阅累积聊天状态：`createChatStateStream(input, adapter?)` → `Observable<ChatStreamState>`。每条事件输出一次状态，不自动收尾文本。
- 处理单个聊天事件：`reduceChatStreamState(state, event)` → 下一份状态；可用于自己的 store，不创建订阅。
- 将剩余文本归入内容块：`flushChatStreamText(state)` → 收尾后的状态；不结束订阅或工具调用。
- 读取完整文本：`getChatStreamText(state)` → `string`；包含已完成文本与正在生成的文本，不修改状态。

## 默认使用 AI SDK，第三方协议才需要 adapter

聊天状态层统一消费 AI SDK 的 `UIMessageChunk`。`reduceChatStreamState` 固定处理这一标准，不需要让每个接口各自定义 reducer。

`useChatStreamState()` 或 `useChatStreamState({ onComplete?, onError? })` 默认使用内置 `aiSdkChatStreamAdapter`。`send` 接收 `AiSdkChatRequest`（`{ url, body }`），通过 POST JSON 请求读取 AI SDK SSE；项目 URL、threadId、messages 等请求内容由应用层构造。

```tsx
import { useChatStreamState } from "@landing-page/utils/stream";

const { state, send, loading, error, stop } = useChatStreamState();
send({ url: "/api/chat", body: { messages, trigger: "submit-message" } });
```

`createChatStateStream({ url, body })` 提供相同的非 React 默认入口。

只有接口输出其他数据格式时，才传 `useChatStreamState({ adapter })` 或 `createChatStateStream(input, adapter)`。自定义 adapter 负责把第三方事件转换为 `UIMessageChunk`，入参由 adapter 自动推导；自定义入参必须配套 adapter，不能省略后落入默认请求逻辑。

项目请求构造和第三方适配器放在应用层；共享包不引用应用代码。

## 只消费事件，不维护 React 状态

已有自己的 store，或只想逐条处理事件时，可以直接使用 `useChatStreamCore`。输入和事件类型均从适配器推导，不依赖 AI SDK：

```tsx
import { useChatStreamCore } from "@landing-page/utils/stream";

// 接口响应的解码、解压和协议转换全部由 adapter 负责。
async function* adapter(
  input: { prompt: string },
  { signal }: { signal: AbortSignal },
) {
  const response = await fetch("/api/custom-text", {
    method: "POST",
    body: input.prompt,
    signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error("缺少响应流");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield { delta: value };
    }
  } finally {
    reader.releaseLock();
  }
}

const { send, stop } = useChatStreamCore({
  adapter,
  onStart: () => console.log("开始请求"),
  onEvent: (event) => console.log(event.delta), // 自动推导为 { delta: string }
  onComplete: () => console.log("流已结束"),
  onError: (message) => console.error(message),
});
```

`adapter` 和 `onEvent` 必填，其余回调可选。core 只返回 `send / stop`，不累积文本或保存 `state / loading / error`，不会因收到事件而主动触发渲染。

- `onStart` 在每次 `send` 时、适配器启动前调用。
- `onEvent` 按顺序收到适配器输出的 `TEvent`，不会对 `type` 等字段作特殊处理。
- 适配器抛错、Observable error 或 `onEvent` 抛错都会终止流并进入 `onError`。自定义协议错误由适配器或消费层解释。
- `onComplete` 不携带累积状态；`useChatStreamState` 负责归约、收尾，再向自己的 `onComplete(state)` 提供最终状态。
- `stop`、下一次 `send` 和卸载只取消请求，不触发 `onComplete / onError`。

非 React 场景可订阅 `createChatEventStream(input, adapter)` 获取原始事件，或订阅 `createChatStateStream(input, adapter)` 获取累积聊天状态。

## Adapter 的职责

`useChatStreamState` 与 `createChatStateStream` 始终使用 `UIMessageChunk` 归约文本与工具调用，自定义 adapter 也必须输出这个统一标准。底层 `useChatStreamCore` 与 `createChatEventStream` 仍可独立处理任意事件，使用时需要显式提供 adapter；它们不负责聊天状态。`ChatStreamAdapter<TInput, TEvent>` 的第二个泛型默认是 `UIMessageChunk`。

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
2. 将供应商响应转换为 `UIMessageChunk`。SSE 只定义传输格式，例如 mock 的 `{ delta }` 仍需转为 `text-delta` 并补齐开始、结束事件。
3. 将 `signal` 传给请求或 SDK，并在清理阶段释放读取器等资源。取消订阅本身无法中断不响应 signal 的外部操作。
4. 通过抛错、Observable error 或 `{ type: "error", errorText }` 报告失败。

Adapter 输出事件，reducer 累积状态，Hook 管理 `state / loading / error`。

下面以返回**原始 UTF-8 文本流**的接口为例；如果接口返回 SSE，需要在适配器中解析 SSE 后再转换事件：

```ts
import type { ChatStreamAdapter } from "@landing-page/utils/stream";

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

接入后 `send` 会自动推导为 `TextInput`，入参完全由适配器定义：

```tsx
const { send, state, stop } = useChatStreamState({
  adapter: textAdapter,
  onComplete: (state) => console.log(getChatStreamText(state)),
});

send({ url: "/api/custom-text", prompt: "你好", model: "example-model" });
```

第三方鉴权、跨域和具体供应商协议由接入方处理。

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
- `error`：状态归约时抛错，终止状态流，交给 Hook 更新 `error` 并调用 `onError`；core 自身不识别这种协议事件。
- 其他事件当前不改变状态；新增 reasoning、文件等展示能力还需要扩展状态归约与 UI。

`blocks` 包含已完成的文本块与工具调用；`streamingTool` 当前只记录一个进行中的工具调用，适配器应按顺序输出工具事件。

`getChatStreamText(state)` 合并已完成文本与实时文本。流正常完成时，Hook 使用 `flushChatStreamText` 将剩余文本写入 `blocks`，然后调用 `onComplete`。

## 生命周期

- 每个 Hook 实例只管理一条活动订阅。再次 `send` 会取消上一条；state hook 同时重置状态、错误和 loading。
- `stop()` 取消订阅并触发适配器的 AbortSignal，保留当前状态，设置 `loading = false`，不调用完成或错误回调。
- 卸载由 core 自动取消订阅，不调用业务回调或更新 React 状态，调用方无需重复注册。
- 同步抛错与异步错误进入同一错误通道；state hook 也会把 AI SDK 错误事件转换为错误。
- 同步完成的适配器，以及完成回调中再次 `send`，不会覆盖新请求的订阅引用。
- 适配器和回调在每次 send 时选定；仅更换 options 不会重启正在进行的请求。

## 验证

运行 `nr test:chat-stream` 验证项目协议、自定义输入、异步流、同步完成、错误和取消。运行 `nr check` 检查代码规范。
