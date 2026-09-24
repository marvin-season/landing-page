# 授权用户迁到 Turso，整理 admin 账号交互；账号页改成目录式左右栏

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

## Light / Dark 拆进 themes (本地时间 11:00:12)
- **文件**: `src/styles/tokens.css`、`src/styles/themes/light.css`、`src/styles/themes/dark.css`、`src/styles/globals.css`、`docs/architecture.md`
- **修改内容**: 删除 `tokens.css`。浅色、深色分别放到 `themes/light.css`、`themes/dark.css`，和 shinchan、apple 并列。
- **原因/上下文**: 目录看起来像只有两套主题，实际 Light / Dark 也是主题。

## 重置授权账号 (本地时间 11:04:00)
- **文件**: `src/lib/page-auth.ts`
- **修改内容**: 将 `verifyCredentials` 使用的账号密码摘要改为 `marvin` / `marvin`。
- **原因/上下文**: 用户要求重置授权账号密码。

## 授权用户改存 Turso，admin 可改密 (本地时间 11:32:00)
- **文件**: `src/lib/auth-users/`、`src/lib/page-auth.ts`、`src/auth.ts`、`src/proxy.ts`、`server/user/index.ts`、`src/app/admin/page.tsx`、`src/app/admin/users/page.tsx`、`docs/architecture.md`
- **修改内容**: 登录校验从源码哈希改为 Turso `auth_users` 表；空表时种子超级管理员 `marvin`。`/admin` 纳入登录门闩，新增账号页可改密码。
- **原因/上下文**: 用户不要 Vercel Blob 文档库，现有 Turso 能用就行。

## 收简 admin 账号页样式 (本地时间 11:38:00)
- **文件**: `src/app/admin/_components/admin-shell.tsx`、`src/app/admin/page.tsx`、`src/app/admin/users/`
- **修改内容**: 管理页改成和授权页一样的窄栏。入口用卡片链接，改密从表格改成每账号一张卡片、上下排列的表单。
- **原因/上下文**: 用户认为 admin 表格样式太丑。

## 重做 admin 账号交互并删除 crud (本地时间 11:43:20)
- **文件**: `src/app/admin/_components/admin-shell.tsx`、`src/app/admin/page.tsx`、`src/app/admin/users/`、`src/app/admin/crud/`、`docs/architecture.md`
- **修改内容**: 账号页默认只展示用户名、角色和更新时间，「修改密码」点开后才出表单，可取消或保存。子页才显示「返回管理」。删除实验性 `/admin/crud`。
- **原因/上下文**: 每张卡都摊开改密表单，看起来像登录页；crud 已不再需要。

## 超级管理员可创建 admin / guest (本地时间 11:46:54)
- **文件**: `src/lib/auth-users/store.ts`、`src/lib/auth-users/store.test.ts`、`server/user/index.ts`、`src/app/admin/users/`、`src/app/admin/page.tsx`、`docs/architecture.md`
- **修改内容**: 角色扩展为 `super_admin` / `admin` / `guest`。只有超级管理员能创建管理员或访客、修改密码；账号页增加按需展开的新建表单。
- **原因/上下文**: 需要刻意创建其他角色账号，且权限仅限超级管理员。

## 修复 user 路由加载失败 (本地时间 11:48:28)
- **文件**: `server/user/index.ts`、`src/lib/auth-users/roles.ts`、`src/app/admin/users/page.tsx`
- **修改内容**: `z.enum(CREATABLE_ROLES)` 初始化时报错导致整个 user 路由没挂上。角色常量拆到独立文件，权限并进 `user.list`，去掉 `user.me`。
- **原因/上下文**: 页面报 `No procedure found on path "user.me"`。

## 将 admin 移入 [lang] (本地时间 14:00:08)
- **文件**: `src/app/[lang]/admin/`、`src/app/admin/`、`src/lib/page-auth.ts`、`src/lib/page-auth.test.ts`、`src/lib/i18n/locales.ts`、`src/proxy.ts`、`docs/architecture.md`、`AGENTS.md`、`docs/README.md`
- **修改内容**: 管理页从独立根布局挪到 `[lang]/admin`，沿用站点语言、主题和设置菜单。英文仍是 `/admin`，其他语言是 `/{lang}/admin`。未登录访问时跳到对应语言的授权地址。
- **原因/上下文**: 用户要求把 admin 移入 `[lang]`。

## 去掉 AdminShell 抽取 (本地时间 14:05:54)
- **文件**: `src/app/[lang]/admin/layout.tsx`、`src/app/[lang]/admin/page.tsx`、`src/app/[lang]/admin/users/page.tsx`、`src/app/[lang]/admin/_components/admin-shell.tsx`
- **修改内容**: 删除复用的 `AdminShell`。页面壳放到 `admin/layout.tsx`，入口页和账号页各自写标题；账号页用返回链接回到父级 `/admin`。
- **原因/上下文**: admin 本身就是 `admin/users` 的父级路由，不必再抽一层壳。

## 账号页改成目录式左右栏 (本地时间 14:32:00)
- **文件**: `src/app/[lang]/admin/users/_components/users-list.tsx`、`user-account-card.tsx`、`create-user-card.tsx`、`users-page-ui.tsx`、`roles.ts`、`format-user-time.ts`
- **修改内容**: 去掉一排同质卡片。账号列表改成可搜索、按角色筛选的目录；桌面端左侧点选、右侧改密或新建，移动端用底部抽屉。相对时间、首字母头像、`/` 聚焦搜索、方向键切换选中。
- **原因/上下文**: 用户认为账号列表没有设计和交互。
