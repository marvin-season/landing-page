# 移除 PPT 与交易记录，授权页纳入多语言，新增 Apple 主题并整理样式目录

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

## 收简授权表单 (本地时间 10:43:00)
- **文件**: `src/app/[lang]/auth/page.tsx`、`src/app/[lang]/auth/_components/submit-button.tsx`
- **修改内容**: 去掉锁图标、居中大卡片、重阴影和转圈按钮。表单改为左对齐窄栏，输入框和按钮沿用设计系统默认样式，错误只显示一行文字。
- **原因/上下文**: 用户认为授权表单装饰过重，希望简约并适配当前主题。

## 新增 Apple 磨玻璃主题 (本地时间 10:53:36)
- **文件**: `src/css/apple.css`、`src/css/globals.css`、`src/hooks/use-theme.ts`、`src/components/theme/`、`packages/design-system/src/{button,card,input,select,sheet,tag,dropdown-menu,hover-card}.tsx`、首页 / changelog / knowledge / agent 相关页面
- **修改内容**: 新增浅色 `apple` 主题：iOS 系统蓝 token、页面色块背景、`glass-surface` 磨玻璃工具类；选择器增加 `Apple · Glass`，默认仍是 `shinchan`。卡片、按钮、弹出层等关键表面加上 `apple:` 变体。
- **原因/上下文**: 用户要求新增一套 Apple 风格磨玻璃 UI 主题。

## 样式目录改为 styles 并分组 (本地时间 10:56:31)
- **文件**: `src/styles/`、各 layout / `error.tsx` / `not-found.tsx`、`components.json`、`AGENTS.md`、`docs/architecture.md`
- **修改内容**: `src/css` 重命名为 `src/styles`。`zone.css` 改为 `tokens.css`，主题放进 `themes/`，首页与 agent 样式放进 `features/`。`globals.css` 只做入口；agent 不再单独引入 sketch 样式。
- **原因/上下文**: 用户认为 css 目录文件杂乱，要求改名并整理。
