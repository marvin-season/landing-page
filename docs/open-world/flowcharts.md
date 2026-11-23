# 开放世界流程图

对应的文字说明见[剧本模式](./group-chat.md)、[小说模式](./novel-mode.md)和[运行架构](./architecture.md)。

## 剧本调度

从操作者输入，到选人、生成，再到下一批接续。

```mermaid
flowchart TD
  input[操作者提交，消息在 store.begin 事务内写入] --> identity{输入身份}
  identity -->|系统| systemMsg[intervention 入房间]
  identity -->|旁白| narrationMsg[narrator 正文入房间]
  identity -->|已启用角色| roleMsg[该角色 agent 对白入房间]
  systemMsg --> begin[store.begin]
  narrationMsg --> begin
  roleMsg --> begin
  autoStart[draft 房间自动开场] --> begin
  begin --> start{需要开跑?}
  start -->|暂停中且未选择继续| saved[只保存，保持暂停]
  start -->|是| run[中止旧运行，创建 WorldRun]
  run --> summary{未摘要历史超过 30 条或 1 万字符?}
  summary -->|是| sumAgent[summary 压缩较早的公开历史]
  sumAgent --> summary
  summary -->|否| pick{nextTurn}
  pick -->|本条有点名| named[被点名角色]
  pick -->|问句干预| ask[最近发言最少的角色回应干预]
  pick -->|直接称呼另一角色，且连续对白少于 4 条| reply[被称呼的角色]
  pick -->|旁白开启，且为开场、非问句干预、对话停滞或连续对白达 3 条| narrate[旁白]
  pick -->|其余| least[最近发言最少的角色]
  named --> actor[actor 生成对白]
  ask --> actor
  reply --> actor
  least --> actor
  narrate --> narrator[narrator 生成旁白]
  actor --> saveMsg[消息标为 complete，turns + 1]
  narrator --> saveMsg
  saveMsg --> more{turns 未达上限?}
  more -->|是| summary
  more -->|否| finish{run.mode}
  finish -->|auto| completed[completed：页面带 continueRunId 发起下一批]
  finish -->|step / retry| paused[paused]
  completed --> begin
```

## 剧本角色与上下文

调度器如何为 actor、narrator 和 summary 分别组装上下文。

```mermaid
flowchart TD
  history[房间公开历史：complete 且非 system 的消息] --> schedule[schedule.ts nextTurn]
  config[WorldConfig 与角色资料] --> schedule
  schedule -->|选中一位 NPC| actorCtx[actorContext]
  schedule -->|旁白| narratorCtx[narratorContext]
  history -->|超过阈值| summaryCtx[summaryContext]

  config -->|公开世界、公开角色资料、本角色完整资料| actorCtx
  config -->|公开世界、公开角色资料| narratorCtx
  config -->|facts 作为事实基线| summaryCtx
  history -->|未摘要部分：自己的话为 assistant，其余为 publicEvent| actorCtx
  history -->|未摘要部分| narratorCtx

  subgraph agents[世界 Agent：无工具、无自动 Memory]
    actor[world-actor：所有 NPC 共用]
    narrator[world-narrator]
    summary[world-summary]
  end
  actorCtx -->|角色模型 + 会话标识| actor
  narratorCtx -->|GROUP_CHAT_DIRECTOR_MODEL 或选中角色的模型| narrator
  summaryCtx -->|第一个启用角色的模型| summary
  actor --> line[本角色的一条对白]
  narrator --> scene[一段旁白]
  summary --> roomSummary[room.summary，不作为发言]
  line --> history
  scene --> history
  roomSummary --> actorCtx
  roomSummary --> narratorCtx
```

## 剧本接口与引擎

从页面请求进入 Route Handler，再到引擎执行、存档和结束。

```mermaid
flowchart TD
  ui[useWorldRoom] -->|读取、轮询、配置、导入导出、暂停| request[worldRequest]
  ui -->|运行| story[worldStoryStream]
  story --> stream[worldStream]
  stream --> runs["POST rooms/:id/runs"]
  request --> other["其余 /api/group-chat 接口"]
  route[route.ts 启动时] --> handlers[createWorldHandlers]
  handlers --> engine["createWorldEngine(worldStore, completeText) → execute"]
  runs --> handle[handle：登录、同源、所有权]
  other --> handle
  handle -->|列表、配置、预设、导入导出| store[worldStore]
  handle -->|模型列表 / 连接测试| proxy[代理]
  handle -->|stop / end / delete| abort[store 更新并 abortRun]
  handle -->|runs| begin[store.begin：幂等、版本、写入输入、新建 WorldRun]
  begin -->|未开跑| json[返回 JSON room]
  begin -->|开跑| execute[execute：SSE 输出事件]
  execute --> loop[按需摘要 → nextTurn → appendMessage → call]
  loop --> complete["completeText → mastra.getAgent(purpose).stream"]
  complete --> proxy
  loop -->|delta 每 500ms 保存片段| during[store.during 续租并写入]
  during --> loop
  loop -->|结束或出错| finishRun[finishRun 并推送 room / done]
```

## 小说模块关系

```mermaid
flowchart TD
  Room[WorldRoomView：按 kind 渲染] --> Panel[NovelPanel]
  Room --> Settings[SettingsSheet + WorldEditor：世界设定与小说设定]
  Settings -->|保存小说设定| Hook
  Settings -->|"configure（storyGoal = 大纲）"| GroupAPI["/api/group-chat"]
  Panel --> Editor[ChapterEditor / RewritePanel]
  Panel --> Plot[PlotSheet]
  Panel --> Context[ContextControls]
  Panel --> Files[NovelFileControls]
  Panel --> Hook[useNovel]
  Editor --> Hook
  Plot --> Hook
  Context --> Hook
  Files --> Hook
  Hook --> Model[model.ts / plot-edit.ts / context-compression.ts / import-novel.ts]
  Hook --> DB[(IndexedDB world-novels)]
  Hook --> Core[useChatStreamCore + aiSdkChatStreamAdapter]
  Hook -->|文件菜单 Fork：复制小说房间| GroupAPI
  Core --> API["POST /api/novel：登录、同源、所有权、kind = novel"]
  API --> Writer[world-writer：按 task 选择指令]
  Writer --> LLM[开放世界代理与第一个启用角色的模型]
```

## 小说任务时序

续写、润色、剧情整理和总结都走同一条链路，差别在于完成后的处理方式。

```mermaid
sequenceDiagram
  actor User as 用户
  participant UI as NovelPanel / 编辑器 / 对话框
  participant Hook as useNovel
  participant API as /api/novel + Writer
  participant DB as IndexedDB
  User->>UI: 触发任务
  UI->>Hook: generate / rewrite / editPlot / compressContext
  Hook->>Hook: 检查就绪与重复提交，构造 prompt 并校验长度
  opt 续写上下文需要压缩
    loop 分批整理前文
      Hook->>API: summary 请求
      API-->>Hook: 返回更新后的剧情摘要
    end
  end
  Hook->>API: { roomId, prompt, task }
  loop 正文流
    API-->>Hook: UIMessageChunk
    Hook-->>UI: preview（剧情整理不显示）
  end
  alt finish 为 stop，流已结束且正文非空
    alt 续写
      Hook->>Hook: 追加到 chapters
      Hook->>DB: 进入写入队列，保存整本
    else 润色 / 剧情整理
      Hook-->>UI: 待应用草稿
      User->>UI: 应用
      Hook->>Hook: 校验小说与 version 未变
      Hook->>DB: 保存（剧情整理先写库再更新页面）
    else 背景总结
      Hook-->>User: 下载背景总结 .md
    else 分支摘要
      Hook-->>UI: 填入摘要框
    end
  else 停止、截断、报错或连接提前结束
    Hook-->>UI: 显示错误，不保存
  end
```
