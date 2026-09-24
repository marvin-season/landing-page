# 移除 PPT 与交易记录，授权页纳入多语言

## 彻底移除 PPT 相关代码 (本地时间 09:46:00)
- **文件**: `src/app/admin/ppt/`、`src/app/api/ppt/`、`src/store/`、`mastra-server/agents/ppt-agent.ts`、`mastra-server/lib/ppt.ts`、`src/lib/constant/agent.ts`、`mastra-server/index.ts`、`src/app/[lang]/(home)/data/home-data.tsx`、`docs/architecture.md`、`docs/tech-stack.md`、`README.md`、`AGENTS.md`、`src/locales/*`
- **修改内容**: 删除 PPT 管理页、生成 API、Fabric 画布 schema、Zustand/IndexedDB 存储、Mastra `pptAgent` 与 `PPT_AGENT` 常量；首页去掉 PPT 入口；移除仅供 PPT 使用的 `fabric`、`idb-keyval`、`zustand`、`immer` 依赖，并清理对应文案与文档描述。
- **原因/上下文**: 用户要求彻底移除项目中的 PPT 相关代码。

## 移除交易记录页 (本地时间 09:50:00)
- **文件**: `src/app/admin/trades/`、`src/app/admin/page.tsx`、`docs/architecture.md`
- **修改内容**: 删除 `/admin/trades` 页面与布局，并去掉管理入口上的「交易记录」链接。
- **原因/上下文**: 用户要求移除 `src/app/admin/trades/`。

## 授权页移入 [lang] 并调整样式 (本地时间 10:40:41)
- **文件**: `src/app/[lang]/auth/`、`src/app/auth/`、`src/lib/page-auth.ts`、`src/proxy.ts`、`src/lib/i18n/locales.ts`、`src/hooks/use-language.ts`、`src/locales/*`、`docs/architecture.md`
- **修改内容**: 授权页从独立根布局挪到 `[lang]/auth`，沿用站点语言、主题和设置菜单。英文仍是 `/auth`，其他语言是 `/{lang}/auth`。未登录访问受保护页时跳到对应语言的授权地址。登录卡片改为与首页一致的圆角磨砂面板，输入框加高，错误提示单独成条，提交时显示等待状态。文案走 Lingui，中文保持原意。
- **原因/上下文**: 用户要求把 Auth 页面放进 `/lang` 目录并优化样式。
