房间里有三类发言：多位 NPC 只说对白，系统只有一个，旁白只有一个。

用户输入默认是系统。输入框上方可以把这一条改成旁白，或改成任意已启用的角色。写下的内容先入房间，再按下图为后续发言选人。

- 系统：这一条是干预。问句交给角色用对白回答；旁白打开时，场景类干预由旁白叙述。
- 旁白：这一条就是旁白正文，不再另写一条旁白。
- 角色：这一条就是该角色已经说出的对白。接下来由其他角色接话；句中点名或 @ 仍优先交给被点到的角色。

`narration` 默认关闭。打开后，开场、场景类系统干预和已经重复的对谈才由旁白叙述。问句干预和点名始终交给对应角色。

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
  pick -->|旁白打开，且是开场、场景类系统干预或对谈已重复| narrate[旁白叙述场景]
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

房间身份与 Mastra Agent 的对应关系如下。只注册 `actor`、`narrator`、`summary` 三个 Agent；多位 NPC 共用同一个 `actor` 实例，每轮由 `nextTurn` 选人，再将该角色作为 `yourCharacter` 传入。角色身份、私有资料和模型按本次调用提供，不为每个 NPC 单独创建 Agent，也不由 Agent 决定谁接话。

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

操作者直接写下的角色对白或旁白先作为已发生的剧情入房间，不调用 Agent 重写；之后才安排后续发言。`context.ts` 负责私有信息隔离：`actor` 只能看到本角色的私有资料和公开信息，`narrator`、`summary` 只接收公开信息。Agent 本身不保存角色历史，房间历史与摘要由 group-chat 存档维护。

每次生成都发送三条上下文消息：system 指令、固定初始化资料、本轮状态与任务。`actor` 的初始化资料包含公开世界设定和本角色完整资料，`narrator` 仅包含公开世界设定，`summary` 仅包含事实基线。摘要、最近干预、未摘要历史和 direction 等变化内容放在最后一条，避免每次改变首条 user 消息，也不重复发送固定资料。

`session.ts` 按所有者、房间、Agent 用途、NPC ID（仅 actor）、模型和配置计算稳定的哈希标识。`engine.ts` 随调用传入，`provider.ts` 通过本次 RequestContext 交给世界 Agent，最终以 `X-Magpie-Session` 请求头发给 Magpie。连续批次、暂停后继续、重试和摘要更新沿用标识；配置或模型变化、另建或导入房间时切换标识。哈希请求头不包含明文角色秘密，不使用全局可变的角色或会话配置。

本机 Magpie Cursor 插件依据会话标识和首条 user 消息生成 `conversation_id`，因此两者都需要稳定。这使同一角色的请求可以复用上游会话标识并争取命中提示词缓存，不代表代理会保存全部剧情供下一次只传增量。每次仍发送完整的有效上下文（固定设定、已有摘要和本次所需公开历史），每条回复仍有一次接口调用；实际缓存命中及收益由代理和模型决定。

进程启动时 `route.ts` 调用一次 `createWorldHandlers`。里面的 `createWorldEngine(worldStore, completeText)` 只执行这一次，得到 `execute`。之后每一批发言都调用这个 `execute`。测试要换假的 `complete`，所以每个用例会再调用一次 `createWorldEngine`。

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
