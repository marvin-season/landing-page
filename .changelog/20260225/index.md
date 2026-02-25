# agui rxjs 页 UI 与状态优化、ActionCard 预置问题与自定义输入

## 优化 rxjs 页 UI 布局与配色
- **文件**: `src/app/agui/rxjs/page.tsx`
- **修改内容**:
  - **布局**：容器改为响应式间距 `px-4 py-8 sm:px-6 sm:py-10`，区块间距由 `gap-6` 调整为 `gap-8`；标题改为 `text-2xl`，描述增加 `leading-relaxed`；操作卡片增加 `min-w-0` 避免溢出。
  - **配色**：工具块（ToolBlock）由 amber 改为使用主题 `primary`（`border-primary/20 bg-primary/5`、流式时 `ring-primary/30`、标题 `text-primary`），与流式文本卡片风格统一；工具块内输入/输出区域增加 `border border-border/60`、`bg-muted/30`，层次更清晰。
  - **响应内容区**：「响应内容」标题改为两侧分隔线 + 小号大写样式（`text-xs uppercase tracking-wider`），区块内卡片间距由 `gap-3` 改为 `gap-4`。
  - **细节**：TextBlock 与流式文本卡片增加 `transition-shadow hover:shadow-md`；统一使用主题变量，便于亮/暗色切换。
- **原因/上下文**：用户要求优化该页的 UI 布局与颜色。

## 流式工具调用状态展示优化
- **文件**: `src/app/agui/rxjs/page.tsx`
- **修改内容**:
  - 为 ToolBlock 增加 `streamingPhase`：`'input-streaming' | 'calling' | 'done'`，用于区分「接收参数中」「正在执行」「已完成」。
  - 接收参数中（仅有 inputStreaming、尚无 input）：标题旁显示「接收参数中…」。
  - 正在执行（已有 input、尚无 output）：标题旁显示「正在执行…」+ Loader2 旋转图标；输出区显示占位块「正在调用工具 xxx，请稍候…」+ 旋转图标，使用 `role="status"` 与 `aria-live="polite"` 便于无障碍。
  - 根据 `streamingTool.input` / `streamingTool.output` 在页面中计算并传入 `streamingPhase`。
- **原因/上下文**：用户希望在调用工具时显示明确的调用中状态，提升交互反馈。

## 工具块增加展开/收起交互
- **文件**: `src/app/agui/rxjs/page.tsx`
- **修改内容**:
  - 使用 `Collapsible` 包裹工具块：标题行（CardHeader）为 `CollapsibleTrigger`，输入/输出内容为 `CollapsibleContent`。
  - 标题左侧增加 `ChevronDown` 图标，展开时旋转 180°，默认 `defaultOpen={true}`。
  - 触发器区域增加 `cursor-pointer`、`hover:bg-muted/20`、`select-none`，便于点击与反馈。
- **原因/上下文**：用户要求工具展示支持展开收起，便于在内容较多时折叠查看。

## 拆分 rxjs 页为多文件组件
- **文件**: `src/app/agui/rxjs/page.tsx`、新增 `constants.ts`、`components/TextBlock.tsx`、`components/ToolBlock.tsx`、`components/StreamingCursor.tsx`、`components/ActionCard.tsx`、`components/ResponseSection.tsx`
- **修改内容**:
  - 将 `CHAT_BODY` 抽到 `constants.ts`。
  - 新增 `TextBlock`、`ToolBlock`（含 `ToolStreamingPhase` 类型）、`StreamingCursor` 为独立组件。
  - 新增 `ActionCard`：操作卡片（messageId、loading、onSend）。
  - 新增 `ResponseSection`：响应内容区（blocks、streamingTool、streamingText），内部复用 TextBlock/ToolBlock/StreamingCursor，并封装 `getStreamingPhase`。
  - 首页 `page.tsx` 仅保留布局、header、ActionCard、错误 Alert、ResponseSection，行数由 271 行缩减至约 55 行。
- **原因/上下文**：首页代码过多，需拆分为合适组件以优化可维护性。

## 新增流式对话状态使用文档
- **文件**: `src/lib/stream/README.md`（新建）
- **修改内容**: 为 `useChatStreamState` 及 `chat-stream-state` 核心方法编写使用文档，包含：Hook 签名与用法、ChatStreamState / ContentBlock / StreamingToolCall 类型说明、`fromChatStreamState` / `reduceChatStreamEvent` / `flushChatStreamState` / `initialChatStreamState` 的说明与事件处理表、数据流概览。
- **原因/上下文**：用户要求为 use-chat-stream-state 及其内部核心方法编写使用文档，放在同一目录下。

## 流式目录 README 增加 RxJS API 使用说明
- **文件**: [src/lib/stream/README.md](../../src/lib/stream/README.md)
- **修改内容**: 在文档末尾新增「RxJS API 使用说明（本目录所用）」章节，说明本项目中用到的：Observable（含义、`new Observable(subscriber)` 与 next/error/complete、清理函数）、`.pipe(...operators)`、`scan(accumulator, seed)`、`subscribe(observer)` 与 Subscription / `unsubscribe()`，并附与各文件的对应关系小结表。
- **原因/上下文**：用户要求整理一份代码中使用到的 RxJS 相关 API 使用说明（如 Observable、pipe 参数、scan、subscribe 等）。

## 使用 ai 包 UIMessageChunk 替代本地 ChatStreamEvent
- **文件**: `src/lib/stream/chat-stream.ts`、`src/lib/stream/chat-stream-state.ts`、`src/lib/stream/README.md`
- **修改内容**:
  - 移除 `ChatStreamEvent` 的二次类型定义，改为直接从 `ai` 包导入并使用 `UIMessageChunk`。
  - `fromChatStream` 返回类型改为 `Observable<UIMessageChunk>`；`reduceChatStreamEvent` 的 event 参数类型改为 `UIMessageChunk`。
  - README 中所有对 `ChatStreamEvent` 的引用改为 `UIMessageChunk`，并注明事件类型与 ai 包一致。
- **原因/上下文**：API 使用 `createUIMessageStreamResponse` 返回的流格式即 UIMessageChunk，与 ai 包类型一致，无需维护重复类型定义。

## ActionCard 与工具调用组件样式修复
- **文件**: [ActionCard.tsx](../../src/app/agui/rxjs/components/ActionCard.tsx)、[ToolBlock.tsx](../../src/app/agui/rxjs/components/ToolBlock.tsx)
- **修改内容**:
  - **ActionCard**：卡片增加 `transition-shadow hover:shadow-md` 与 TextBlock 一致；CardHeader 改为显式 `px-6 py-4` 避免与默认 `p-6` 覆盖导致 padding 不统一；增加 `flex-wrap` / `sm:flex-nowrap` 与 `min-w-0 flex-1` 改善小屏布局与截断；描述使用 `truncate sm:whitespace-normal` 避免长 messageId 撑破布局。
  - **ToolBlock**：展开箭头旋转改为基于 `group` + `group-data-[state=open]:rotate-180` 施加在 ChevronDown 上，修复此前选择器导致旋转未正确作用在图标上的问题；CardHeader 使用显式 `px-6 py-4`；标题行增加 `flex-wrap` 防止状态文案换行错位；内容区 `CardContent` 使用 `px-6 pb-6 pt-0`，输入/输出块统一为 `rounded-lg`、`py-2.5`，长文本使用 `wrap-break-word` 替代 `wrap-anywhere`；「正在调用工具」占位块去掉 `font-mono` 以符合说明文案样式。
- **原因/上下文**：用户反馈 ActionCard 与工具调用组件存在样式问题，统一内边距、修正箭头旋转目标并与其他卡片风格一致。

## ActionCard 支持预置问题与自定义输入发送
- **文件**: [constants.ts](../../src/app/agui/rxjs/constants.ts)、[ActionCard.tsx](../../src/app/agui/rxjs/components/ActionCard.tsx)、[page.tsx](../../src/app/agui/rxjs/page.tsx)
- **修改内容**:
  - **constants**：抽出 `RESOURCE_ID`；新增 `PRESET_QUESTIONS`（北京天气、上海天气、今天日期）；新增 `buildChatBody(text)`，根据用户输入文本构建与 CHAT_BODY 同结构的请求体（使用 nanoid 生成 message id）。
  - **ActionCard**：`onSend` 改为接收 `(body: Record<string, unknown>)`；增加预置问题按钮（outline、rounded-full），点击即发送对应文本；增加输入框 + 发送按钮表单，提交时调用 `onSend(buildChatBody(inputValue))` 并清空输入；loading 时禁用预置按钮与输入、发送按钮显示 Loader。
  - **page**：移除对 CHAT_BODY 的引用，`onSend={(body) => send(body)}`。
- **原因/上下文**：用户需要既可点击预置问题快速测试，也可在输入框输入内容后发送。

## 动态 RESOURCE_ID：开始会话入口与路由参数
- **文件**: [constants.ts](../../src/app/agui/rxjs/constants.ts)、[ActionCard.tsx](../../src/app/agui/rxjs/components/ActionCard.tsx)、[page.tsx](../../src/app/agui/rxjs/page.tsx)、新建 [agui/rxjs/[resourceId]/page.tsx](../../src/app/agui/rxjs/[resourceId]/page.tsx)
- **修改内容**:
  - **路由**：`/agui/rxjs` 改为入口页，仅展示「开始会话」按钮；点击后 `crypto.randomUUID()` 生成 resourceId，`router.push(\`/agui/rxjs/${resourceId}\`)`。新增 `/agui/rxjs/[resourceId]` 为对话页，从 `useParams().resourceId` 读取会话 ID，渲染原有 ActionCard + 错误 Alert + ResponseSection。
  - **constants**：移除固定 `RESOURCE_ID` 与 `CHAT_BODY`；`buildChatBody(resourceId: string, text: string)` 改为接收动态 resourceId，请求体中的 `resourceId` / `id` 均使用该参数。
  - **ActionCard**：新增必选 prop `resourceId: string`，调用 `buildChatBody(resourceId, text)` 构建请求体。
  - 无效或缺失 resourceId 时，对话页展示「无效的会话 ID」提示。
- **原因/上下文**：用户要求由用户主动创建会话 ID，首页展示开始会话按钮，RESOURCE_ID 放在路由参数中。

## 历史对话与主流智能问答式页面改造
- **文件**: [use-chat-stream-state.ts](../../src/lib/stream/use-chat-stream-state.ts)、新建 [use-chat-history.ts](../../src/app/agui/rxjs/hooks/use-chat-history.ts)、[AssistantBubbleContent.tsx](../../src/app/agui/rxjs/components/AssistantBubbleContent.tsx)、[ChatMessageBubble.tsx](../../src/app/agui/rxjs/components/ChatMessageBubble.tsx)、[ChatMessageList.tsx](../../src/app/agui/rxjs/components/ChatMessageList.tsx)、[ChatInput.tsx](../../src/app/agui/rxjs/components/ChatInput.tsx)、[agui/rxjs/[resourceId]/page.tsx](../../src/app/agui/rxjs/[resourceId]/page.tsx)
- **修改内容**:
  - **useChatStreamState**：`send(body, options?)` 支持可选 `onComplete(flushedState)`，在流结束并 flush 后调用，便于页面将会话回合追加到列表。
  - **useChatHistory**：新建 Hook，GET `/api/chat?resourceId=xxx` 拉取历史，将返回的 `toAISdkV5Messages` 格式规范为 `ChatDisplayMessage[]`（user/assistant，含 content 或 blocks）。
  - **AssistantBubbleContent**：抽取与 ResponseSection 一致的助理内容渲染（TextBlock + ToolBlock + 流式文本/工具），供单条助理气泡复用。
  - **ChatMessageBubble**：单条消息气泡，支持 user（右侧文案）、assistant（左侧，纯文案或 AssistantBubbleContent）、以及流式 assistant（传入 streaming state）。
  - **ChatMessageList**：可滚动列表，展示历史 + 本会话消息，末尾可接当前流式回复；加载历史时占位「加载历史消息…」，空列表时占位「暂无消息」；自动滚动到底。
  - **ChatInput**：底部输入区（预置问题 + 输入框 + 发送），无卡片包裹，与主流问答布局一致。
  - **[resourceId] 对话页**：进入时拉取历史；展示 ChatMessageList + ChatInput；发送时先追加 user 到 sessionMessages，流结束后在 onComplete 中追加 assistant（由 flushed.blocks 等构成）；displayMessages = historyMessages + sessionMessages，流式回复作为列表最后一项展示。
- **原因/上下文**：接口已提供 GET /api/chat?resourceId=xxx 获取历史，需展示历史聊天记录并在发送后以问答形式展示消息，类似主流智能问答系统。

## 历史消息中工具调用回显与类型扩展
- **文件**: [use-chat-history.ts](../../src/app/agui/rxjs/hooks/use-chat-history.ts)
- **修改内容**:
  - 扩展 API 消息 part 类型：`ApiTextPart`（type "text", text）、`ApiToolPart`（type "tool-xxx", toolCallId, input, output, state），与 GET 返回的 toAISdkV5Messages 结构一致。
  - 新增 `partsToBlocks(parts, messageId)`：遍历 assistant 的 parts，将 `type === "text"` 转为 `TextBlock`，将 `type.startsWith("tool-")` 转为 `ToolCallBlock`（toolName 取 type 去掉 "tool-" 前缀），忽略 step-start 等；保证历史助理消息与流式回复使用同一套 ContentBlock 结构。
  - 助理历史消息优先使用 `blocks`（由 parts 生成），无 blocks 时仍用 `content`；流式交互（ToolBlock 展开/收起、输入输出展示）不变，历史中的工具调用以相同 ToolBlock 组件回显。
- **原因/上下文**：保留原有工具调用交互，并对历史记录中的 tool-* parts 进行回显（与示例消息中 type: "tool-weatherTool"、input/output 等结构对齐）。
