# thread API 与 rxjs 会话页完全重写、thread CRUD 迁移至 tRPC

## thread CRUD 迁移至 tRPC
- **文件**: `server/model/thread/index.ts`，`server/index.ts`，`src/app/agui/rxjs/layout.tsx`，`src/app/agui/rxjs/page.tsx`，删除 `src/app/api/thread/route.ts`
- **修改内容**:
  - 将 thread 的 list/create/update/delete 逻辑从 REST API 迁移到 `server/model/thread` tRPC router；注册 `threadRouter` 到 `appRouter`。
  - 前端 `rxjs/page.tsx` 使用 `useQuery(trpc.thread.list.queryOptions())` 与 `useMutation(trpc.thread.*.mutationOptions())` 替代原 fetch/request 调用。
  - rxjs layout 增加 `TankQueryClientProvider` 以支持 tRPC；删除 `/api/thread` 路由文件。
- **原因/上下文**: 用户要求将 thread 相关 API 逻辑迁移到 server/model/thread，前端 CRUD 统一通过 tRPC 调用。

## 修复重命名/删除 Thread not found
- **文件**: `src/app/api/thread/route.ts`，`src/app/agui/rxjs/page.tsx`
- **修改内容**: PUT/DELETE 支持 resourceId；查找 thread 时依次尝试 getThreadById(threadId)、getThreadById(resourceId)、getThreadsByResourceId+getThreadById；前端在重命名/删除时传入 resourceId。
- **原因/上下文**: 用户反馈修改名称报错 "Thread not found"，列表返回的 id 与 storage 的 threadId 可能不一致，增加 resourceId 与 getThreadsByResourceId 回退查找。

## 优化 request.ts 增加 baseUrl
- **文件**: `src/lib/request.ts`
- **修改内容**: 新增 `getBaseUrl()` 导出；重构 `getApiUrl` 使用统一 baseUrl、规范 path 拼接；`request` 支持 `RequestOptions`（含 `throwOnError`）、非 2xx 时抛错、按 Content-Type 解析 JSON/text；服务端 baseUrl 缺失时抛错。
- **原因/上下文**: 用户要求优化并增加 baseUrl。

## 重写 thread API 与 rxjs 页 (changelog 记录)
- **文件**: `src/app/api/thread/route.ts`，`src/app/agui/rxjs/page.tsx`
- **修改内容**:
  - API: 简化逻辑，移除 `toAISdkV5Messages`、`recallThreadMessages`、单线程详情 GET 等复杂分支；使用 memory 直接调用 `createThread`、`listThreads`、`getThreadById` + `update`/`delete`；统一 `str()` 解析请求体；将 Date 转为 ISO 字符串返回。
  - 前端: 重写布局为 header + main 结构，移除 Card 包装；顶部固定 header 含标题、说明、新建/刷新按钮；列表为简洁 list，支持内联编辑与进入/重命名/删除；统一错误态与加载态展示。
- **原因/上下文**: 用户要求完全重写两文件，接口不复杂、使用 memory 直接操作，前端采用合理布局。
