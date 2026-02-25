# streamingText 空不展示且固定底部

- **文件**: `src/app/agui/rxjs/page.tsx`
- **修改内容**:
  - 当 `streamingText === ""` 时不渲染流式文本块（仅在有实际内容时展示）。
  - 渲染顺序改为：先 `blocks`，再 `streamingTool`，最后 `streamingText`，保证流式文本块始终在最底部。
  - `hasContent` 改为依赖 `hasStreamingText`（`streamingText != null && streamingText !== ""`），避免空字符串时仍显示「响应内容」区块。
- **原因/上下文**: 用户要求两点优化：空字符串不展示 streaming 块；streamingText 模块始终在底部。
