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
- **开放世界**：`src/lib/group-chat/provider.ts` 通过三类世界 Agent 处理 NPC 对白（`actor`）、旁白（`narrator`）和公开剧情摘要（`summary`）。选人及旁白触发由 `schedule.ts` 的 `nextTurn` 决定，不再使用 director Agent。每次调用的角色指令和上下文由 `context.ts` 组装；世界状态和消息由 group-chat 存档管理，Agent 不启用自动 Memory 或工具，避免角色私有上下文混用。用户可按系统、旁白或已启用角色身份输入，具体流程见 [开放世界架构](../src/lib/group-chat/README.md)。
- **小说**：`/api/novel` 使用同一工厂创建的 `writer` Agent，复用 `GROUP_CHAT_BASE_URL` / `GROUP_CHAT_API_KEY`，从已验证所有权的房间选择第一个启用角色的模型；全部禁用时取第一个角色。写章与背景总结均由该 Writer 完成，不启用工具或自动 Memory。
- **Thread**：`server/thread/index.ts` 通过 `mastra` 获取 agent memory，用于会话/线程

## 别名

`tsconfig` 中配置了 `$`、`$/*` 指向 `mastra-server`，引用示例：`~/mastra-server`、`~/mastra-server/constant`。
