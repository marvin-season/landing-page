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
