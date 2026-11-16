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
  named --> line[一条角色对白]
  reply --> line
  ask --> line
  talk --> line
  least --> line
  narrate --> narrator[一条旁白]
  line --> visible[房间里出现一条消息]
  narrator --> visible
  visible --> next{本批条数用完?}
  next -->|否| summary
  next -->|是| done[status=completed 客户端再开一批]
```

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
