# 流式对话状态 (Chat Stream State)

本目录提供基于 RxJS 的流式对话状态管理：将 SSE 流解析为事件序列，再归约为可被 React 消费的 `ChatStreamState`。

## 目录结构

| 文件 | 职责 |
|------|------|
| `use-chat-stream-state.ts` | React Hook，封装订阅与 `state / send / loading / error` |
| `chat-stream-state.ts` | 状态类型、归约函数、`fromChatStreamState`、`flushChatStreamState` |
| `chat-stream.ts` | 底层 SSE → `Observable<ChatStreamEvent>` |

---

## 1. useChatStreamState（React Hook）

### 签名

```ts
function useChatStreamState(url: string): {
  state: ChatStreamState;
  send: (body: Record<string, unknown>) => void;
  loading: boolean;
  error: string | null;
}
```

### 参数

- **url**：流式接口地址（POST），例如 `"/api/chat"`。

### 返回值

- **state**：当前流式对话状态（见下文 `ChatStreamState`）。
- **send(body)**：发起一次请求。会先取消上一次未完成的订阅、清空错误、将状态重置为 `initialChatStreamState`，再订阅 `fromChatStreamState(url, body)`；每次 `next` 更新 `state`，`complete` 时调用 `flushChatStreamState` 并置 `loading = false`，`error` 时写入错误信息并置 `loading = false`。
- **loading**：是否有进行中的请求。
- **error**：最近一次请求的错误信息，无错误时为 `null`。

### 使用示例

```tsx
function ChatPage() {
  const { state, send, loading, error } = useChatStreamState("/api/chat");
  const { messageId, blocks, streamingText, streamingTool } = state;

  return (
    <>
      <button onClick={() => send({ messages: [...] })} disabled={loading}>
        发送
      </button>
      {error && <p>{error}</p>}
      {/* 根据 blocks、streamingText、streamingTool 渲染内容 */}
    </>
  );
}
```

### 行为说明

- 每次调用 `send(body)` 会先执行 `subscriptionRef.current?.unsubscribe()`，再创建新订阅，因此同一时刻只会有一个请求在跑。
- 请求开始时状态会被重置为 `initialChatStreamState`，便于新对话展示。
- 流 **complete** 时会对当前 state 执行一次 `flushChatStreamState`，把尚未写入 `blocks` 的 `streamingText` 追加为文本块。

---

## 2. 状态类型（ChatStreamState）

定义在 `chat-stream-state.ts`。

### ChatStreamState

```ts
type ChatStreamState = {
  messageId: string | null;   // 当前消息 ID（来自 start 事件）
  blocks: ContentBlock[];     // 已确定的内容块（文本 + 已完成工具调用）
  streamingText: string;      // 当前正在生成的文本（未写入 blocks）
  currentTextId: string | null;
  streamingTool: StreamingToolCall | null;  // 正在进行的工具调用（若有）
};
```

- **blocks**：按顺序的已完结内容，包含文本块和工具调用块。
- **streamingText**：流式文本增量会先拼在这里，在 `text-start`/`text-end` 或 `flushChatStreamState` 时再写入 `blocks`。
- **streamingTool**：当前正在执行的工具调用（参数可能仍在流式接收或已在执行），结束时会被写入 `blocks` 并置为 `null`。

### ContentBlock

```ts
type TextBlock = { kind: "text"; id: string; content: string };

type ToolCallBlock = {
  kind: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
};

type ContentBlock = TextBlock | ToolCallBlock;
```

### StreamingToolCall

```ts
type StreamingToolCall = {
  toolCallId: string;
  toolName: string;
  inputStreaming: string;  // 流式接收中的输入原文
  input?: unknown;         // 已解析的完整 input（若已收到 tool-input-available）
  output?: unknown;        // 若已收到 tool-output-available
};
```

UI 可根据 `input` / `output` 是否为空判断阶段：仅 `inputStreaming` → 接收参数中；有 `input` 无 `output` → 执行中；有 `output` → 已完成（随后会写入 `blocks` 并清空 `streamingTool`）。

---

## 3. fromChatStreamState（创建状态流）

### 签名

```ts
function fromChatStreamState(
  url: string,
  body: Record<string, unknown>,
): Observable<ChatStreamState>;
```

### 说明

- 内部使用 `fromChatStream(url, body)` 得到 `Observable<ChatStreamEvent>`，再通过 `pipe(scan(reduceChatStreamEvent, initialChatStreamState))` 归约为 `Observable<ChatStreamState>`。
- 每次事件会调用 `reduceChatStreamEvent(prevState, event)` 得到新状态并下发。
- 仅订阅时才会发起请求；取消订阅会中止底层 SSE 读取。

---

## 4. reduceChatStreamEvent（状态归约）

### 签名

```ts
function reduceChatStreamEvent(
  state: ChatStreamState,
  event: ChatStreamEvent,
): ChatStreamState;
```

### 处理的事件类型

| 事件 type | 含义 | 状态变化概要 |
|-----------|------|----------------|
| `start` | 流开始 | 设置 `messageId` |
| `text-start` | 新文本段开始 | 将上一段 `streamingText` 写入 `blocks`，清空 `streamingText`，设置 `currentTextId` |
| `text-delta` | 文本增量 | `streamingText += event.delta` |
| `text-end` | 文本段结束 | 将当前 `streamingText` 写入 `blocks`，清空并置 `currentTextId = null` |
| `tool-input-start` | 工具调用开始 | 先 flush 当前文本段，再设置 `streamingTool: { toolCallId, toolName, inputStreaming: "" }` |
| `tool-input-delta` | 工具输入流式片段 | `streamingTool.inputStreaming += event.inputTextDelta` |
| `tool-input-available` | 工具输入已就绪 | `streamingTool.input = event.input` |
| `tool-output-available` | 工具输出已就绪 | 将当前 `streamingTool` 转为 `ToolCallBlock` 追加到 `blocks`，`streamingTool = null` |

未列出的其他事件类型会原样返回当前 `state`（不变）。

---

## 5. flushChatStreamState（结束时的收尾）

### 签名

```ts
function flushChatStreamState(state: ChatStreamState): ChatStreamState;
```

### 说明

- 若存在 `currentTextId` 且 `streamingText` 非空，则将当前 `streamingText` 作为一块文本追加到 `blocks`，并清空 `streamingText` 与 `currentTextId`。
- 否则仅做浅拷贝并可选地清空 `streamingText`（保证不变性）。
- **使用场景**：流 `complete` 时对最后一条 state 调用一次，避免最后一段流式文本残留在 `streamingText` 而未进入 `blocks`。`useChatStreamState` 在 `complete` 回调中会执行 `setState((s) => flushChatStreamState(s))`。

---

## 6. initialChatStreamState

```ts
const initialChatStreamState: ChatStreamState = {
  messageId: null,
  blocks: [],
  streamingText: "",
  currentTextId: null,
  streamingTool: null,
};
```

用作 `scan` 的初始值，以及 `useChatStreamState` 在每次 `send` 时的重置状态。

---

## 数据流概览

```
POST /api/chat (body)
  → fromChatStream(url, body)     → Observable<ChatStreamEvent>
  → scan(reduceChatStreamEvent)   → Observable<ChatStreamState>
  → useChatStreamState 内 subscribe
      → next: setState
      → complete: setState(flushChatStreamState(s)), setLoading(false)
      → error: setError(...), setLoading(false)
```

上层只需消费 `state`（及 `loading` / `error`），无需直接处理 `ChatStreamEvent`。

---

## RxJS API 使用说明（本目录所用）

本目录用到的 RxJS 概念与 API 简要说明，便于阅读和修改流式状态相关代码。

### Observable（可观察对象）

- **是什么**：表示一段随时间发出的值序列（或零个/一个值），可以是同步或异步。本项目中「事件流」「状态流」都是 `Observable`。
- **创建方式**（本项目中）：
  - **`new Observable(subscribe)`**（`chat-stream.ts`）：通过传入一个 **subscribe 函数** 创建。该函数在有人订阅时执行，接收一个 **Subscriber** 对象，用于：
    - `subscriber.next(value)`：发出一个值；
    - `subscriber.error(err)`：发出错误并结束；
    - `subscriber.complete()`：正常结束，不再发值。
  - 若该函数返回一个函数，则该返回函数会在**取消订阅或 complete/error 时**被调用，用于清理（如取消 fetch、关闭 reader）。本项目里用其设置 `cancelled = true` 并 `reader?.cancel()`。
- **类型**：`Observable<T>` 表示该流会发出类型为 `T` 的值，例如 `Observable<ChatStreamEvent>`、`Observable<ChatStreamState>`。

### .pipe(...operators)（管道与操作符）

- **作用**：在现有 Observable 上按顺序应用一系列**操作符**，得到一个新的 Observable，不改变原来的流。
- **语法**：`observable.pipe(op1, op2, op3)`，每个参数是一个「操作符」（函数）。数据流方向：上游 → op1 → op2 → op3 → 下游。
- **本项目中的用法**（`chat-stream-state.ts`）：
  ```ts
  fromChatStream(url, body).pipe(
    scan(reduceChatStreamEvent, initialChatStreamState),
  );
  ```
  含义：上游是 `Observable<ChatStreamEvent>`，经过 `scan` 后变成 `Observable<ChatStreamState>`。

### scan(accumulator, seed)（累积归约）

- **来源**：`import { scan } from "rxjs"`。
- **签名**：`scan<T, R>(accumulator: (acc: R, value: T) => R, seed: R): OperatorFunction<T, R>`  
  即：对每个上游发出的 `T`，用 `accumulator(当前累积值, T)` 得到新的累积值并作为下游的 `R` 发出。
- **本项目中的用法**：
  ```ts
  scan(reduceChatStreamEvent, initialChatStreamState)
  ```
  - **seed**：`initialChatStreamState`。`scan` 会先向下游发出一次 seed，之后每收到一个上游事件就调用 `accumulator(当前状态, 事件)` 并发出新的状态。
  - **accumulator**：`reduceChatStreamEvent(state, event)`，即「当前状态 + 新事件 → 新状态」。
- **效果**：把「事件流」归约成「状态流」：先发出初始状态，再每来一个 `ChatStreamEvent` 就发出更新后的 `ChatStreamState`，实现状态机。

### subscribe(observer)（订阅）

- **作用**：订阅一个 Observable，开始执行其内部的 subscribe 逻辑（例如发起 fetch），并接收它发出的值。
- **参数**：通常传入一个 **Observer 对象**，包含部分或全部：
  - `next(value)`：收到一个值；
  - `error(err)`：收到错误，流结束；
  - `complete()`：流正常结束。
- **本项目中的用法**：
  - **use-chat-stream-state.ts**：
    ```ts
    fromChatStreamState(url, body).subscribe({
      next: setState,
      error: (err) => { setError(...); setLoading(false); },
      complete: () => { setState((s) => flushChatStreamState(s)); setLoading(false); ... },
    });
    ```
  - **api/agui/[agentId]/route.ts**：将 Observable 转成 SSE，在 `next` 里往 ReadableStream 写数据，`complete` 时关闭流，`error` 时 controller.error。
- **返回值**：**Subscription** 对象，常用方法：
  - `subscription.unsubscribe()`：取消订阅，停止接收并触发创建 Observable 时返回的清理函数（如取消 fetch、reader.cancel()）。
- 本项目在 `useChatStreamState` 中用 `subscriptionRef.current?.unsubscribe()` 在下次 `send` 时取消上一次请求，避免重复订阅。

### 小结（与本目录的对应关系）

| API / 概念      | 使用位置               | 用途简述 |
|-----------------|------------------------|----------|
| `new Observable(subscribe)` | `chat-stream.ts` 的 `fromChatStream` | 用 fetch + ReadableStream 解析 SSE，通过 `subscriber.next/error/complete` 发出事件 |
| `Observable<T>` 类型        | `chat-stream-state.ts` 等            | 标注事件流 / 状态流的类型 |
| `.pipe(scan(...))`          | `chat-stream-state.ts` 的 `fromChatStreamState` | 把事件流归约为状态流 |
| `scan(accumulator, seed)`   | 同上                                  | 用 `reduceChatStreamEvent` 做状态归约 |
| `.subscribe({ next, error, complete })` | `use-chat-stream-state.ts`、`route.ts` | 消费状态流 / 事件流并更新 UI 或写出 SSE |
| `subscription.unsubscribe()`| `use-chat-stream-state.ts`           | 取消上一次请求，释放资源 |
