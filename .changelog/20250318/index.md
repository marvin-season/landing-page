# 首页数据驱动重构（当日变更摘要）

## 提取结构化 JSON 数据渲染首页
- **文件**: `src/app/[lang]/(home)/data/home.json`（新建）、`src/app/[lang]/(home)/hooks/use-home-data.ts`（新建）、`src/app/[lang]/(home)/_components/home-content.tsx`（新建）、`src/app/[lang]/(home)/page.tsx`（修改）
- **修改内容**:
  - 新增 `home.json` 结构化数据，包含 profile（name、avatar、titleKey、subtitleKey）、navLinks（href、titleKey、descriptionKey、badge）、quotes（文案 key 数组）
  - 新增 `useHomeData` hook，从 JSON 读取数据并通过 Lingui `t` 做 i18n 翻译
  - 新增 `HomeContent` 客户端组件，基于 hook 数据渲染 Sections、NavCard、Quote
  - 精简 `page.tsx` 为异步入口，仅渲染 `<HomeContent />`
- **原因/上下文**: 用户要求将首页展示内容提取为结构化 JSON 并重构，UI 保持不变

## 首页数据改为 .ts 文件（减少冗余）
- **文件**: `src/app/[lang]/(home)/hooks/use-home-data.ts`、`src/app/[lang]/(home)/data/home.json`（删除）
- **修改内容**: 删除 `home.json`，将结构化数据直接内联到 `use-home-data.ts`，采用与 `use-experience` 相同的模式，在 hook 内定义 profile、navLinks、quotes 并用 `t\`...\`` 做 i18n
- **原因/上下文**: 用户认为 JSON + key 映射写法过于冗余

## 首页改用 Trans 组件替代 useHomeData hook
- **文件**: `src/app/[lang]/(home)/data/home-data.tsx`（新建）、`src/app/[lang]/(home)/_components/home-content.tsx`、`src/app/[lang]/(home)/hooks/use-home-data.ts`（删除）
- **修改内容**: 删除 `use-home-data` hook，新建 `home-data.tsx` 导出 profile、navLinks、quotes，可翻译字段直接使用 `<Trans>` 包裹；`HomeContent` 改为 server 组件，从 data 导入并渲染
- **原因/上下文**: 用户要求直接使用 Trans 组件，不使用 hook
