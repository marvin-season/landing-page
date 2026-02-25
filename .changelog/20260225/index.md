# agui rxjs 页 UI 布局、配色、流式工具状态与组件拆分

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
- **文件**: `src/lib/stream/README.md`
- **修改内容**: 在文档末尾新增「RxJS API 使用说明（本目录所用）」章节，说明本项目中用到的：Observable（含义、`new Observable(subscriber)` 与 next/error/complete、清理函数）、`.pipe(...operators)`、`scan(accumulator, seed)`、`subscribe(observer)` 与 Subscription / `unsubscribe()`，并附与各文件的对应关系小结表。
- **原因/上下文**：用户要求整理一份代码中使用到的 RxJS 相关 API 使用说明（如 Observable、pipe 参数、scan、subscribe 等）。
