# agui rxjs 页 UI 布局、配色与流式工具状态优化

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
