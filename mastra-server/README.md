# Mastra Server

本目录为项目的 [Mastra](https://mastra.ai/) 服务端配置与逻辑，用于 Agent 管理、对话与工作流。

## 结构

| 路径 | 说明 |
|------|------|
| `index.ts` | Mastra 实例：注册 agents、workflows、storage、logger、observability |
| `constant.ts` | 默认 agent ID、resource ID，以及 `AgentConstant` 的 re-export |
| `storage/` | LibSQL 存储（本地 `file:./db/mastra.db`，无 DB 时可用内存） |
| `agents/` | Agent 定义（如 `general-agent`） |
| `tools/` | 工具：weather、email、stock 等 |
| `workflows/` | 工作流（如 `weather-workflow`） |
| `lib/` | 工具函数（如请求参数解析 `resolve.ts`） |

## 使用方式

- **Chat API**：`src/app/api/chat/route.ts` 使用 `handleChatStream` 与 `mastra` 处理流式对话
- **Thread**：`server/thread/index.ts` 通过 `mastra` 获取 agent memory，用于会话/线程

## 别名

`tsconfig` 中配置了 `$`、`$/*` 指向 `mastra-server`，引用示例：`~/mastra-server`、`~/mastra-server/constant`。
