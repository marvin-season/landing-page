# 开放世界运行架构

## 1. 页面

| 路由 | 组件 | 职责 |
| --- | --- | --- |
| `/agent/worlds` | [`WorldLobby`](../../src/app/agent/worlds/_components/world-lobby.tsx) | 我的作品（全部 / 剧本 / 小说筛选）、导入 JSON 存档、导入小说、创建作品 |
| `/agent/worlds/templates` | [`WorldTemplatesLobby`](../../src/app/agent/worlds/_components/world-templates-lobby.tsx) | 预设模板：我的（本地模板 + 世界 / 角色预设）、内置模板 |
| `/agent/worlds/[roomId]` | [`WorldRoomView`](../../src/app/agent/worlds/_components/world-room/index.tsx) | 按房间 `kind` 渲染剧本对话区或 [`NovelPanel`](../../src/app/agent/worlds/_components/novel/novel-panel.tsx)，共用顶栏、世界侧栏和设定面板 |

**创建作品**：作品页的「创建作品」以 `fog-harbor` 模板为初始值；预设模板页的「使用模板」以所选模板派生，「我的预设 → 使用」以世界预设为初始值。创建面板顶部切换剧本或小说，由 [`WorldEditor`](../../src/app/agent/worlds/_components/world-editor.tsx) 编辑设定，提交时 `POST /api/group-chat/rooms` 携带 `kind`，成功后进入详情。

**详情页共用部分**：

- [`RoomHeader`](../../src/app/agent/worlds/_components/world-room/room-header.tsx)：标题、运行状态、类型标签、世界侧栏开关和「设定」按钮。剧本运行中或小说生成中时「设定」不可用。剧本对话区和小说阅读区滚回顶部附近时展开房间顶栏，离开顶部一小段后再平滑收起（带滞回，避免贴顶抖动）。编辑小说章节或打开世界设定时，房间顶栏立即隐藏。
- [`WorldNotes`](../../src/app/agent/worlds/_components/world-room/world-notes.tsx)：宽屏显示为右侧栏。窄屏时，小说以对话框打开，剧本以抽屉打开。展示角色公开资料、背景、前置剧情、场景、事实、规则；剧本另外显示系统操作者、旁白、剧情摘要、本批发言数与用量，并可点名角色。
- [`SettingsSheet`](../../src/app/agent/worlds/_components/world-room/settings-sheet.tsx)：上方是 [`ArchiveActions`](../../src/app/agent/worlds/_components/world-room/archive-actions.tsx)（导出、备份、复制世界、结束故事），下方是 `WorldEditor`。小说房间以对话框打开，剧本房间以右侧抽屉打开。故事结束后只保留存档操作。小说房间的编辑器额外显示小说名称、文风、大纲和每章字数，见[小说模式 · 设定来源](./novel-mode.md#3-设定来源)。

## 2. 模块分层

| 层 | 位置 | 内容 |
| --- | --- | --- |
| 页面与表单 | `src/app/agent/worlds/` | 作品页、预设模板页、详情、编辑器、剧本对话组件 `world-room/`、小说组件 `novel/` |
| 房间读取与剧本运行 | [`use-world-room.ts`](../../src/app/agent/worlds/_components/use-world-room.ts) | 读取与轮询房间、剧本自动开场、发起 / 暂停 / 重试运行、加载更早消息 |
| 小说状态 | [`novel/use-novel.ts`](../../src/app/agent/worlds/_components/novel/use-novel.ts)、[`novel/use-novel-storage.ts`](../../src/app/agent/worlds/_components/novel/use-novel-storage.ts) | 前者负责 Writer 请求、流式草稿、完成判定、上下文压缩归档和 Fork；后者负责 IndexedDB 读写、草稿恢复和存档同步 |
| 小说纯函数 | `novel/model.ts`、`plot-edit.ts`、`context-compression.ts`、`import-novel.ts`、`chapter-*.ts` | 数据结构、Writer 指令与上下文、续写摘要归档、导入导出、章节文本与差异 |
| 浏览器客户端 | [`client.ts`](../../src/lib/group-chat/client.ts) | `worldRequest`、`worldStream`（单批 SSE）、`worldStoryStream`（自动接续多批）、`downloadText` |
| Route Handlers | [`api/group-chat/[[...path]]`](../../src/app/api/group-chat/[[...path]]/route.ts)、[`api/novel`](../../src/app/api/novel/route.ts) | 登录、同源校验、房间所有权、请求解析 |
| 领域与服务 | `src/lib/group-chat/` | `model.ts` 数据契约、`http.ts` 路由分发、`store.ts` 存档、`engine.ts` 运行、`schedule.ts` 选人、`context.ts` 上下文、`provider.ts` 模型调用、`session.ts` 会话标识、`novel.ts` Writer 接口、`world-template-model.ts` 模板类型与纯函数、`world-templates.ts` 模板读写（Node fs）、`extract-world-template.ts` 从小说提取模板 |
| Agent | [`mastra-server/agents/world-agents.ts`](../../mastra-server/agents/world-agents.ts) | `world-actor`、`world-narrator`、`world-summary`、`world-writer` |

流式传输复用 `@landing-page/utils/stream` 的 `useChatStreamCore`：剧本用自定义适配器 `worldStoryStream`，小说用 `aiSdkChatStreamAdapter` 解析 AI SDK UI 消息流。两边都不另写 SSE 解析器。

## 3. 房间与世界配置

`WorldRoom`（[`model.ts`](../../src/lib/group-chat/model.ts)）包含 `kind`、`status`（`draft` / `active` / `ended`）、`config`、`version`、`snapshots`、`messages`、`summary`、`run`、`runs`、`paused`。

- `kind` 为 `script` 或 `novel`，创建和导入时必填。配置更新接口不接受 `kind`；列表只返回这两类房间。
- 每次 `configure` 使 `version + 1` 并追加配置快照。剧本消息记录生成时的 `configVersion`。
- 小说房间不会发起运行，`status` 保持 `draft`，直到结束故事变为 `ended`。

`WorldConfig` 字段：

| 字段 | 约束 | 剧本用途 | 小说用途 |
| --- | --- | --- | --- |
| `title` | ≤60 | 世界名称 | 世界名称；首次打开小说时作为书名默认值 |
| `background` | 必填，≤8000 | 公开世界设定 | Writer 上下文 |
| `priorContext` | 可选，≤8000 | 已发生的前置剧情，作为公开设定 | 已发生的前置剧情，随完整世界设定发送 |
| `scene` | 必填，≤2000 | 初始场景 | Writer 上下文 |
| `rules` / `facts` | ≤4000 | 世界规则 / 公共事实；`facts` 也是摘要的事实基线 | Writer 上下文 |
| `storyGoal` | ≤4000 | 故事推进要求 | 保存小说设定时写入小说大纲 |
| `narration` | 默认 `false` | 旁白开关 | 不使用（编辑器不显示） |
| `characters` | 2～7 位，名称、ID 唯一 | NPC；`enabled` 控制能否发言 | 角色资料全部交给 Writer；第一个启用角色的 `model` 作为写作模型 |
| `maxTurns` | 1～10 | 每批发言条数（模板为 3，编辑器不提供修改） | 不使用 |

角色字段：`name`、`identity`、`personality`、`goal`、`publicInfo`、`privateInfo`、`style`、`model`（默认 `cursor/auto`）、`enabled`、可选 `avatar`。

**前置剧情**：[`PriorContextField`](../../src/app/agent/worlds/_components/prior-context-field.tsx) 支持粘贴，或从 TXT / Markdown（≤2 MB）追加导入，合并后不超过 8000 字。导入小说的「背景总结」文件时只取总结正文，不读取文件里的元数据。前置剧情不生成剧本消息，也不增加章节数。

## 4. 数据归属

| 数据 | 权威来源 | 说明 |
| --- | --- | --- |
| 房间、世界配置、配置快照、剧本消息、剧情摘要、运行记录 | 服务端 libSQL `world_rooms`（每个房间一份 JSON 文档加列表摘要） | 默认 `file:./db/group-chat.db`，与 Mastra 单聊数据库分开 |
| 运行请求幂等与暂停封锁 | `world_requests` | 以 `(room_id, clientRequestId)` 去重；暂停时写入 `cancelled` 封锁迟到的请求 |
| 世界预设、角色预设 | `world_presets` | 与房间互不影响，创建房间时复制配置快照 |
| 小说设定、章节、续写摘要（`checkpoint`） | 浏览器 IndexedDB `world-novels.novels`，键为 `${ownerId}:${roomId}` | 摘要归档只改 `checkpoint`，正文仍完整保留；不随房间跨设备同步；删除或复制房间都不处理这份数据，Fork 会整本复制含摘要 |
| 生成中的小说草稿 | `useNovel` 内存；待应用结果另有本机备份 | 流式过程只在内存；续写 / 整章润色 / 选段润色 / 剧情整理的待应用结果刷新后可恢复 |

## 5. 接口

`/api/group-chat/*` 由 [`createWorldHandlers`](../../src/lib/group-chat/http.ts) 分发。所有请求都要求登录，非 GET 请求要求同源 `Origin`，房间读写都会校验所有者。

| 方法与路径 | 作用 |
| --- | --- |
| `GET models` | 通过 OpenAI SDK 读取代理 `/models` |
| `POST connection` | 用指定模型做一次纯文本连接测试 |
| `GET/POST presets`，`PATCH/DELETE presets/:id` | 预设列表、新建、更新、删除 |
| `GET rooms` / `POST rooms` | 作品列表（最多 200 个）/ 创建房间（必须带 `kind`） |
| `POST rooms/import` | 导入 `world-chat` JSON 备份（≤6 MB），生成新房间 |
| `GET rooms/:id` | 房间视图，消息只返回最近 100 条 |
| `GET rooms/:id/messages?before=seq` | 向前分页加载消息 |
| `GET rooms/:id/export[?format=markdown\|narration]` | JSON 备份 / 对话 Markdown / 旁白 Markdown |
| `PATCH rooms/:id` | `configure`（带 `expectedVersion`）、`rename`、`end` |
| `DELETE rooms/:id` | 删除房间及幂等记录，并中止进行中的运行 |
| `POST rooms/:id/runs` | 剧本运行：写入输入，返回 SSE 事件流；仅保存不运行时返回 JSON |
| `POST rooms/:id/stop` | 暂停运行并封锁对应请求 |

`POST /api/novel` 由 [`createNovelHandler`](../../src/lib/group-chat/novel.ts) 处理，见[小说模式 · Writer 接口](./novel-mode.md#5-writer-接口)。

## 6. Agent 与模型代理

四个世界 Agent 由同一个工厂创建，模型在每次调用时由 `RequestContext` 提供：

| Agent | 用途 | 调用方 |
| --- | --- | --- |
| `world-actor` | NPC 对白，所有 NPC 共用一个实例 | `engine.ts` → `provider.ts` |
| `world-narrator` | 旁白 | 同上 |
| `world-summary` | 剧本公开历史摘要 | 同上 |
| `world-writer` | 小说写章、润色、剧情整理、背景总结 | `novel.ts` → `handleChatStream` |

- 统一连接 `GROUP_CHAT_BASE_URL`（默认 `http://127.0.0.1:3425/v1`），密钥为 `GROUP_CHAT_API_KEY`（默认 `magpie`）。模型 ID 原样传给代理。
- 请求体强制加上 `tool_choice: "none"`，不注册工具，不启用自动 Memory。剧本收到工具流时直接报错。
- 每次调用的 system 指令由 `context.ts`（剧本）或小说 `model.ts`（小说）提供，Agent 自身只有一句通用指令。选人逻辑属于 `schedule.ts`，与 Agent 无关。

**会话标识**：[`worldSessionId`](../../src/lib/group-chat/session.ts) 对 `[ownerId, roomId, purpose, characterId, model, config]` 做 SHA-256，生成 `world-<purpose>-<hash>`，以 `X-Magpie-Session` 请求头发给代理。同一房间、同一角色、同一模型、同一配置下标识不变，因此连续批次、暂停后继续、重试和摘要都沿用同一个标识；修改配置或模型、复制世界、导入备份或 Fork 小说时会换新标识。请求头里只有哈希，不含明文配置。

本机 Magpie 代理根据会话标识和首条 user 消息派生上游会话，用来争取提示词缓存命中。每次调用仍然发送完整的有效上下文；缓存是否命中、能省多少，由代理和模型决定。

## 7. 模板、预设、备份与复制

- **模板**：`data/novels/template/*.json`（内置，`source: "builtin"`）和不提交的 `data/novels/template/local/*.json`（我的，`source: "local"`），文件名就是模板 ID。同目录里的 TXT 是模板附带的正文。角色头像仍在 `public/worlds/avatars`。扁平模板需同时通过 `configSchema` 和元数据（`description`、`details`、`gradient`）校验；可选 `kind`（`script` / `novel`，缺省为剧本）。`format` 为 `world-chat` 的备份也可以直接作为模板：世界设定取 `config`，作品类型取 `kind`；缺少卡片元数据时，说明用初始场景，细节用角色名，渐变按文件名生成。每个角色都要有 `avatar`；任一模板无效时页面加载失败。预设模板页按来源分成「我的」与「内置」；「我的」还包含世界 / 角色预设。
- **导入小说 / 模板派生**：作品页「导入小说」把 ≤2MB 的 TXT / Markdown 收录为独立小说作品（默认占位设定 + 本机 IndexedDB 正文），导入后直接打开作品；列表不再提供「生成模板」。预设模板页「使用模板」派生小说时写入 `sourceTemplateId`。作品右上角「设定」可手工改字段，或点「从正文更新设定」调用 `POST /api/group-chat/templates/extract` 回填表单（需再点保存）。本地模板仍可由 `POST /api/group-chat/templates` 写入 `data/novels/template/local/`。提取超时最多 180 秒。实现见 [`ImportNovelTemplateDialog`](../../src/app/agent/worlds/_components/import-novel-template-dialog.tsx)、[`WorldEditor`](../../src/app/agent/worlds/_components/world-editor.tsx)。
- **预设**：编辑器可把当前世界存为世界预设，或把单个角色存为角色预设，已选中的预设可以原地更新。套用世界预设时保留当前已填写的前置剧情。
- **JSON 备份**：`format: "world-chat"`、`schemaVersion: 1`，包含 `kind`、配置、全部快照、版本、消息、摘要，也包含角色私有资料（导出前会提示确认），不含 API 密钥。小说备份只有世界设定，没有章节；如果小说备份里带有消息，导入时会被拒绝。
- **导入**：校验快照版本、消息顺序、发言者与点名引用，然后生成新房间和新消息 ID。摘要清空后重新整理，运行不恢复，房间处于暂停状态。
- **复制世界**：用当前配置和类型新建房间。剧本消息、小说章节都不复制。

## 8. 验证

```sh
nr test:group-chat   # src/lib/group-chat/*.test.ts：存档、权限、上下文隔离、调度、接续、幂等、暂停竞态、摘要、provider、会话、Writer 接口、模板、从小说提取模板、开发模式小说 TXT 落盘
nr test:novel        # novel/*.test.ts：上下文、导入导出、剧情整理、摘要归档、Fork、章节文本、Markdown 位置映射、差异
nr check
node_modules/.bin/tsc --noEmit --incremental false
```

单元测试覆盖控制流、存档与协议边界，不验证真实代理连通性、IndexedDB 恢复或模型生成质量。UI 由用户手工验收。
