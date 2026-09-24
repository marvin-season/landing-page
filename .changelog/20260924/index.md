# 移除 PPT 与交易记录

## 彻底移除 PPT 相关代码 (本地时间 09:46:00)
- **文件**: `src/app/admin/ppt/`、`src/app/api/ppt/`、`src/store/`、`mastra-server/agents/ppt-agent.ts`、`mastra-server/lib/ppt.ts`、`src/lib/constant/agent.ts`、`mastra-server/index.ts`、`src/app/[lang]/(home)/data/home-data.tsx`、`docs/architecture.md`、`docs/tech-stack.md`、`README.md`、`AGENTS.md`、`src/locales/*`
- **修改内容**: 删除 PPT 管理页、生成 API、Fabric 画布 schema、Zustand/IndexedDB 存储、Mastra `pptAgent` 与 `PPT_AGENT` 常量；首页去掉 PPT 入口；移除仅供 PPT 使用的 `fabric`、`idb-keyval`、`zustand`、`immer` 依赖，并清理对应文案与文档描述。
- **原因/上下文**: 用户要求彻底移除项目中的 PPT 相关代码。

## 移除交易记录页 (本地时间 09:50:00)
- **文件**: `src/app/admin/trades/`、`src/app/admin/page.tsx`、`docs/architecture.md`
- **修改内容**: 删除 `/admin/trades` 页面与布局，并去掉管理入口上的「交易记录」链接。
- **原因/上下文**: 用户要求移除 `src/app/admin/trades/`。
