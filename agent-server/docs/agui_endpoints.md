# Agno AGUI 接口端点文档

当使用 `from agno.os.interfaces.agui import AGUI` 包装 agno 服务后，会提供以下接口端点：

## 主要端点

### 1. `/agui` (POST)
**标准 AG-UI 协议端点**

- **方法**: POST
- **用途**: 主要的 AG-UI 协议通信端点
- **协议**: 支持 Server-Sent Events (SSE) 流式响应
- **内容类型**: 
  - `text/event-stream` (SSE 格式)
  - `application/vnd.ag-ui.event+proto` (Protocol Buffer 格式)
- **使用场景**: 
  - 与 `@ag-ui/client` 的 `HttpAgent` 配合使用
  - 支持标准的 AG-UI 协议事件流

**示例**:
```typescript
const agent = new HttpAgent({
  url: "http://localhost:7777/agui",
});
```

### 2. `/agents/{agent_id}/runs` (POST)
**Agent 运行端点**

- **方法**: POST
- **路径参数**: 
  - `agent_id`: Agent 的 ID（通常是 agent name 的 slug 化版本）
- **请求体**: 
  - `message`: 用户消息（字符串）
  - `stream`: 是否流式响应（布尔值，可选）
  - `session_id`: 会话 ID（字符串，可选）
- **响应**: Server-Sent Events (SSE) 流
- **事件格式**: agno 自定义事件格式（非标准 AG-UI 协议）

**示例**:
```typescript
const formData = new FormData();
formData.append("message", "hello");
formData.append("stream", "true");
formData.append("session_id", "your-session-id");

fetch("/api-agent/agents/prosemirror-agent/runs", {
  method: "POST",
  body: formData,
});
```

**事件类型**:
- `RunStarted`: 运行开始
- `ModelRequestStarted`: 模型请求开始
- `RunContent`: 流式内容（增量更新）
- `ModelRequestCompleted`: 模型请求完成
- `ToolCallStarted`: 工具调用开始
- `ToolCallCompleted`: 工具调用完成
- `RunContentCompleted`: 内容完成
- `RunCompleted`: 运行完成

### 3. `/agents` (GET, 可能)
**获取可用 Agents 列表**

- **方法**: GET（如果支持）
- **用途**: 列出所有可用的 agents
- **响应**: Agent 列表，包含 agent_id 和相关信息

## 端点对比

| 端点 | 协议 | 格式 | 适用场景 |
|------|------|------|----------|
| `/agui` | AG-UI 标准协议 | SSE/Proto | 与 `@ag-ui/client` 集成 |
| `/agents/{agent_id}/runs` | agno 自定义格式 | SSE | 直接调用特定 agent |

## 使用建议

1. **使用 `/agui` 端点**：
   - 当需要与标准的 AG-UI 客户端库集成时
   - 需要跨框架兼容性时
   - 使用 `HttpAgent` 时

2. **使用 `/agents/{agent_id}/runs` 端点**：
   - 当需要直接调用特定 agent 时
   - 需要 agno 特定的事件格式时
   - 使用原生 fetch 或自定义客户端时

## 注意事项

1. **Agent ID 确定**：
   - 如果 agent 设置了 `name`，agno 会生成对应的 agent_id（通常是 name 的 slug 化版本）
   - 例如：`name="ProseMirror Agent"` → `agent_id="prosemirror-agent"`
   - 如果 agent 没有设置 name，可能需要查看后端日志或使用默认值

2. **协议差异**：
   - `/agui` 使用标准的 AG-UI 协议
   - `/agents/{agent_id}/runs` 使用 agno 自定义的事件格式
   - 两者的事件结构不同，需要相应的解析逻辑

3. **流式响应**：
   - 两个端点都支持流式响应
   - `/agui` 使用标准的 AG-UI 事件类型
   - `/agents/{agent_id}/runs` 使用 agno 自定义事件类型

## 参考

- [AG-UI 协议文档](https://docs.ag-ui.com/)
- [Agno 文档](https://docs.agno.com/)
- 项目中的示例：
  - `src/app/agui/raw/page.tsx` - 使用 `/agui` 端点
  - `src/components/editor/ProseMirrorEditor.tsx` - 使用 `/agents/{agent_id}/runs` 端点
