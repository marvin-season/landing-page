# Mastra PPT 生成接入与 API 调整（当日变更摘要）

## 接入 Mastra PPT 生成 Agent (本地时间 10:00:00)
- **文件**: `mastra-server/agents/ppt-agent.ts`, `mastra-server/index.ts`, `src/lib/constant/agent.ts`
- **修改内容**: 新增 `pptAgent`，使用 Mastra `Agent` 和 DeepSeek 模型生成 PPT 内容；在 Mastra 初始化中注册该 Agent，并在 `AgentConstant` 中增加 `PPT_AGENT` 常量。
- **原因/上下文**: 需要在 `@mastra-server` 内部提供一个专门用于生成符合 `fabricSlidesDocumentSchema` 的 PPT 生成 Agent，方便后续 API 统一通过 Mastra 调用。

## /api/ppt API 迁移到 Mastra 调用 (本地时间 10:05:00)
- **文件**: `src/app/api/ppt/route.ts`
- **修改内容**: 移除原先直接通过 `ai` + `createDeepSeek` 的 `streamObject` 实现，改为使用 `mastra` 获取 `pptAgent`，通过 `agent.generate` + `structuredOutput`（schema 为 `fabricSlidesDocumentSchema`）生成 PPT JSON，并返回标准 JSON 响应。
- **原因/上下文**: 按需求将 PPT 生成 API 迁移为通过 `mastra-server` 调用，复用 Mastra 的 Agent 能力与结构化输出能力。

## PPT 管理页调用方式调整 (本地时间 10:10:00)
- **文件**: `src/app/admin/ppt/page.tsx`
- **修改内容**: 移除对 `experimental_useObject` 的依赖，改为使用 `fetch("/api/ppt")` 直接获取 JSON 结果；保持原有 `PRESETS` 与 `normalizeFabricSlideJSON` 逻辑不变，并在成功返回后将生成的 PPT 写入本地 `usePptStore`；同时简化流式预览逻辑，仅在生成完成后更新幻灯片列表。
- **原因/上下文**: 由于 `/api/ppt` 已改为通过 Mastra Agent 的结构化输出返回一次性 JSON，为保持兼容性与实现简单可靠，将前端改为普通请求/响应模式。

## 优化 PPT Agent 提示词与生成逻辑 (本地时间 10:20:00)
- **文件**: `src/app/admin/ppt/fabric-slide-schema.ts`, `mastra-server/lib/ppt.ts`, `src/app/api/ppt/route.ts`
- **修改内容**:
  - 在 `FABRIC_PPT_SYSTEM_PROMPT` 中补充整体文档结构、版式布局和内容语气等约束（明确封面页/内容页结构、标题条布局、要点数量和文字风格），提升生成质量与一致性。
  - 新增 `mastra-server/lib/ppt.ts`，封装 `generatePptSlides` helper：内部使用 Mastra `pptAgent.stream` + `structuredOutput`（schema 为 `fabricSlidesDocumentSchema`）以流式方式构建结构化结果，对外暴露为一次性返回的 `FabricSlidesDocument`，简化 API。
  - 将 `/api/ppt` 的实现整理为调用 `generatePptSlides`，路由层只负责参数校验与错误处理，生成逻辑集中在 Mastra helper 中以便后续扩展（例如接入真正前端流式协议）。
- **原因/上下文**: 需要在保持 `/api/ppt` 使用 Mastra 的前提下，增强 PPT 生成的结构和内容质量，并预留基于 Mastra 流式能力的扩展点，同时让生成逻辑从路由中抽离，代码组织更清晰。

