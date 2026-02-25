# 优化 RxJS 流式对话页 UI

- **文件**: `src/app/agui/rxjs/page.tsx`
- **修改内容**:
  - 使用项目内 `Button`、`Card`、`Alert` 组件统一视觉与交互
  - 增加页面标题与说明（流式对话示例 + 简短描述）
  - 操作区改为 Card + CardHeader，左侧标题/描述、右侧主按钮，并展示 messageId
  - 抽取 `TextBlock`、`ToolBlock`、`StreamingCursor` 子组件，便于复用与样式统一
  - 工具调用块使用 Card + 琥珀色边框/背景，流式时增加脉动圆点与 ring
  - 流式文本块使用 primary 色系高亮，光标动画改为 `StreamingCursor` 组件
  - 错误态使用 `Alert` + 破坏性样式（border/background/text）
  - 无内容时不渲染「响应内容」区块；有内容时显示「响应内容」标题与列表
  - 按钮 loading 时显示 `Loader2` 旋转图标与「请求中…」文案
- **原因/上下文**: 用户要求优化当前页面 UI，在保持流式逻辑不变的前提下提升可读性、层次感和一致性。
