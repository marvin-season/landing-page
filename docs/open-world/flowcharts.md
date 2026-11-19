# 开放世界流程图

汇总剧本和小说的运行流程。对应的实现说明见[开放世界文档索引](./README.md)。

## 剧本调度

从操作者输入，到选人、生成对白或旁白，再到下一批接续。

```mermaid
flowchart TD
  input[用户写下一条] --> identity{输入身份}
  identity -->|系统，默认| systemMsg[系统干预入房间]
  identity -->|旁白| narrationMsg[旁白正文入房间，不再另写]
  identity -->|某个已启用角色| roleMsg[该角色对白入房间]
  systemMsg --> start
  narrationMsg --> start
  roleMsg --> start
  start[本批开始] --> summary{未摘要历史过长?}
  summary -->|是| sumAgent[summary 压缩公开剧情]
  sumAgent --> summary
  summary -->|否| pick{下一条怎么选}
  pick -->|用户 @ 了某位角色| named[该角色说对白]
  pick -->|角色对白里点名，且对谈未停滞| reply[被点名的角色说对白]
  pick -->|系统问句| ask[最近最少发言的角色用对白回答]
  pick -->|旁白关闭| talk[角色只说对白]
  pick -->|旁白打开，且是开场、场景干预、对谈重复或已到叙事间隔| narrate[旁白落实行动并推进场景]
  pick -->|其余情况| least[最近最少发言的角色说对白]
  named --> actorAgent[actor 生成被选中角色的对白]
  reply --> actorAgent
  ask --> actorAgent
  talk --> actorAgent
  least --> actorAgent
  actorAgent --> line[一条角色对白]
  narrate --> narratorAgent[narrator 生成场景叙述]
  narratorAgent --> narrator[一条旁白]
  line --> visible[房间里出现一条消息]
  narrator --> visible
  visible --> next{本批条数用完?}
  next -->|否| summary
  next -->|是| done[status=completed 客户端再开一批]
```

## 剧本角色与上下文

展示调度器如何为角色、旁白和摘要组装各自的上下文。

```mermaid
flowchart TD
  operator[用户／故事外的系统操作者，不是 Agent] --> identity{本条输入身份}
  identity -->|系统| intervention[系统干预]
  identity -->|旁白| narration[已经发生的旁白正文]
  identity -->|已启用角色| dialogue[该角色已经说出的对白]
  intervention --> history[group-chat 管理的房间历史与摘要]
  narration --> history
  dialogue --> history

  npcs[多位 NPC，各自配置身份、私有资料和模型] --> schedule[schedule.ts / nextTurn 选择本轮角色或旁白]
  history --> schedule
  schedule -->|选中一位 NPC| actorContext[actorContext：公开世界与历史、该角色资料、direction]
  npcs -->|只取被选中角色的完整资料| actorContext
  schedule -->|需要旁白，且旁白已开启| narratorContext[narratorContext：公开世界与历史、direction]
  history -->|历史过长时| summaryContext[summaryContext：旧摘要、事实基线、待压缩公开历史]

  subgraph agents[三个 Mastra Agent，均不启用自动 Memory 或工具]
    actor[actor：所有 NPC 共用，按本次角色模型生成]
    narrator[narrator：全世界共用的旁白]
    summary[summary：后台公开剧情整理者]
  end
  actorContext -->|provider.ts 按次传入指令和上下文| actor
  narratorContext -->|provider.ts 按次传入指令和上下文| narrator
  summaryContext -->|provider.ts 按次传入指令和上下文| summary
  actor --> actorOutput[仅被选中角色的对白，不代写他人]
  narrator --> narratorOutput[场景、环境事件和可见结果，不代写对白]
  summary --> summaryOutput[新的公开剧情摘要，不作为房间发言]
  actorOutput --> history
  narratorOutput --> history
  summaryOutput --> history
```

## 剧本接口与引擎

从页面请求进入 Route Handler，再到引擎执行、存档和结束。

```mermaid
flowchart TD
  route[route.ts] --> handlers[createWorldHandlers]
  handlers --> engine["createWorldEngine(worldStore, completeText)"]
  engine --> execute[execute]
  ui[useWorldRoom] --> story[worldStoryStream]
  ui --> request[worldRequest]
  story --> stream[worldStream]
  stream --> runs["POST rooms/:id/runs"]
  request --> other["其余 /api/group-chat"]
  runs --> handle[handle]
  other --> handle
  handle -->|列表、配置、导入导出| store[worldStore]
  handle -->|连接测试| complete[completeText]
  handle -->|开跑| begin[store.begin]
  begin --> execute
  handle -->|暂停、结束、删除| abort[abortRun]
  execute --> batch{summaryBatch 过长?}
  batch -->|是| summary["summaryContext → call(summary)"]
  summary --> complete
  summary --> batch
  batch -->|否| plan[nextTurn]
  plan --> draft[appendMessage]
  draft -->|旁白| narrator["narratorContext → call(narrator)"]
  draft -->|对白| actor["actorContext → call(actor)"]
  narrator --> complete
  actor --> complete
  complete --> agent["mastra.getAgent(purpose).stream"]
  narrator --> saved[store.during 写入正文]
  actor --> saved
  saved --> more{turn < run.limit?}
  more -->|是| batch
  more -->|否| finish[finishRun]
```

## 小说模块关系

展示小说面板、浏览器存档、生成接口和 Writer 的依赖关系。

```mermaid
flowchart TD
  Room[WorldRoomView：按存档类型渲染详情] --> Chat[useWorldRoom：房间读取与剧本运行]
  Room --> Panel[NovelPanel：创作要求、章节编辑与导出]
  Panel --> Hook[useNovel：读取存档、生成与保存]
  Hook --> Model[model.ts：小说结构、上下文、请求与导出文本]
  Hook --> Store[Dexie / IndexedDB：world-novels]
  Hook --> Core[共享 useChatStreamCore 与 AI SDK 状态归约]
  Core --> API[POST /api/novel：会话认证与房间所有权校验]
  API --> Writer[World Novel Writer：单 Writer 职责]
  Writer --> LLM[开放世界代理与首个启用角色的模型]
```

## 小说章节生成

展示章节从发起请求、接收流式草稿到保存或终止的时序。

```mermaid
sequenceDiagram
  actor User as 用户
  participant UI as NovelPanel
  participant Hook as useNovel
  participant API as /api/novel + Writer
  participant DB as IndexedDB
  User->>UI: 生成下一章
  UI->>Hook: generate()
  Hook->>Hook: 就绪与重复触发检查，构造完整上下文
  Hook->>API: 一个章节请求
  loop 正文流
    API-->>Hook: UIMessageChunk
    Hook-->>UI: preview
  end
  alt 收到正常 finish，流完成且正文非空
    Hook->>Hook: 追加或插入到内存 chapters
    Hook->>DB: 排队保存整本小说
    DB-->>Hook: 成功或保存错误
  else 停止、协议错误、截断或连接提前结束
    Hook-->>UI: 保留内存草稿与错误，不保存新章节
  end
```

## 初版剧本设计

历史方案，保留了当时的 tRPC 和模型适配层设想。现行链路见上面的[剧本接口与引擎](#剧本接口与引擎)。

```mermaid
flowchart LR
  UI[群聊页面与输入组件] --> CRUD[tRPC 房间与预设管理]
  UI --> STREAM[同源生成与控制接口]
  CRUD --> STORE[群聊持久化存储]
  STREAM --> ENGINE[群聊编排器]
  ENGINE --> CTX[上下文与权限过滤]
  ENGINE --> STORE
  CTX --> ADAPTER[Chat Completions 适配器]
  ADAPTER --> PROXY[本地代理 127.0.0.1:3425]
  ENGINE --> EVENTS[群聊事件流]
  EVENTS --> UI
```
